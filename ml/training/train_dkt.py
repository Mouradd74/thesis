"""
DKT Training Script

Trains the Deep Knowledge Tracing LSTM model on the ASSISTments 2009-2010
Skill-builder dataset.

Usage:
    cd thesis
    python -m ml.training.train_dkt
"""

import os
import sys
import time
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from ml.models.dkt import DKTModel, encode_interaction


# ─── Configuration ───────────────────────────────────────────────────────────

DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'assistments.csv')
MODEL_SAVE_PATH = os.path.join(os.path.dirname(__file__), '..', 'saved_models', 'dkt_model.pt')
MAX_SEQ_LEN = 200       # Truncate student sequences to this length
MIN_INTERACTIONS = 5     # Ignore students with fewer interactions
BATCH_SIZE = 64
EPOCHS = 15
LEARNING_RATE = 0.001
HIDDEN_SIZE = 128
TEST_SPLIT = 0.2


# ─── Dataset ─────────────────────────────────────────────────────────────────

class DKTDataset(Dataset):
    """PyTorch dataset for DKT training."""

    def __init__(self, sequences, num_skills):
        self.sequences = sequences
        self.num_skills = num_skills

    def __len__(self):
        return len(self.sequences)

    def __getitem__(self, idx):
        seq = self.sequences[idx]
        length = len(seq)

        # Encode inputs: interaction at time t
        inputs = []
        # Targets: (skill_at_t+1, correct_at_t+1) — we predict the NEXT step
        target_skills = []
        target_labels = []

        for i in range(length - 1):
            skill_id, correct = seq[i]
            inputs.append(encode_interaction(skill_id, bool(correct), self.num_skills))
            
            next_skill, next_correct = seq[i + 1]
            target_skills.append(next_skill)
            target_labels.append(float(next_correct))

        actual_len = len(inputs)

        # Pad to MAX_SEQ_LEN - 1 (since we lose one for the target shift)
        pad_len = (MAX_SEQ_LEN - 1) - actual_len
        if pad_len > 0:
            inputs += [[0.0] * (2 * self.num_skills)] * pad_len
            target_skills += [0] * pad_len
            target_labels += [0.0] * pad_len

        return (
            torch.tensor(inputs, dtype=torch.float32),
            torch.tensor(target_skills, dtype=torch.long),
            torch.tensor(target_labels, dtype=torch.float32),
            torch.tensor(actual_len, dtype=torch.long),
        )


# ─── Data Loading ────────────────────────────────────────────────────────────

def load_and_preprocess():
    """Load ASSISTments CSV and build student interaction sequences."""
    print("[DKT] Loading dataset...")
    df = pd.read_csv(DATA_PATH, encoding='latin1')

    # Keep only rows with valid skill_id and correct values
    df = df.dropna(subset=['skill_id', 'correct'])
    df['skill_id'] = df['skill_id'].astype(int)
    df['correct'] = df['correct'].astype(int).clip(0, 1)

    # Re-map skill IDs to contiguous range [0, N)
    unique_skills = sorted(df['skill_id'].unique())
    skill_map = {sid: idx for idx, sid in enumerate(unique_skills)}
    df['skill_idx'] = df['skill_id'].map(skill_map)
    num_skills = len(unique_skills)

    print(f"[DKT] {len(df)} interactions, {df['user_id'].nunique()} students, {num_skills} skills")

    # Group by student, build sequences ordered by order_id
    sequences = []
    for uid, group in df.groupby('user_id'):
        group = group.sort_values('order_id')
        seq = list(zip(group['skill_idx'].tolist(), group['correct'].tolist()))
        if len(seq) >= MIN_INTERACTIONS:
            # Truncate long sequences
            seq = seq[:MAX_SEQ_LEN]
            sequences.append(seq)

    print(f"[DKT] {len(sequences)} valid student sequences (min {MIN_INTERACTIONS} interactions)")

    return sequences, num_skills, skill_map


# ─── Training ────────────────────────────────────────────────────────────────

def compute_auc(model, dataloader, num_skills, device):
    """Compute AUC-ROC on a dataset."""
    from sklearn.metrics import roc_auc_score

    model.eval()
    all_preds = []
    all_labels = []

    with torch.no_grad():
        for inputs, target_skills, target_labels, lengths in dataloader:
            inputs = inputs.to(device)
            lengths = lengths.to(device)

            probs = model(inputs, lengths)  # (batch, seq_len, num_skills)

            for i in range(inputs.shape[0]):
                seq_len = lengths[i].item()
                for t in range(seq_len):
                    skill = target_skills[i, t].item()
                    pred = probs[i, t, skill].item()
                    label = target_labels[i, t].item()
                    all_preds.append(pred)
                    all_labels.append(label)

    if len(set(all_labels)) < 2:
        return 0.5  # Can't compute AUC with single class

    return roc_auc_score(all_labels, all_preds)


def train():
    """Main training loop."""
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"[DKT] Using device: {device}")

    # Load data
    sequences, num_skills, skill_map = load_and_preprocess()

    # Train/test split by student
    np.random.seed(42)
    indices = np.random.permutation(len(sequences))
    split = int(len(sequences) * (1 - TEST_SPLIT))
    train_seqs = [sequences[i] for i in indices[:split]]
    test_seqs = [sequences[i] for i in indices[split:]]

    print(f"[DKT] Train: {len(train_seqs)} students, Test: {len(test_seqs)} students")

    train_dataset = DKTDataset(train_seqs, num_skills)
    test_dataset = DKTDataset(test_seqs, num_skills)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    # Build model
    model = DKTModel(num_skills=num_skills, hidden_size=HIDDEN_SIZE).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    criterion = nn.BCELoss(reduction='none')

    print(f"[DKT] Model parameters: {sum(p.numel() for p in model.parameters()):,}")
    print(f"[DKT] Starting training for {EPOCHS} epochs...")
    print("-" * 60)

    best_auc = 0.0

    for epoch in range(1, EPOCHS + 1):
        model.train()
        epoch_loss = 0.0
        epoch_count = 0
        start_time = time.time()

        for inputs, target_skills, target_labels, lengths in train_loader:
            inputs = inputs.to(device)
            target_skills = target_skills.to(device)
            target_labels = target_labels.to(device)
            lengths = lengths.to(device)

            optimizer.zero_grad()
            probs = model(inputs, lengths)  # (batch, seq_len, num_skills)

            # Extract predicted probability for the actual target skill at each timestep
            batch_size = inputs.shape[0]
            seq_len = probs.shape[1]
            
            # Gather predictions for target skills
            target_skills_expanded = target_skills[:, :seq_len].unsqueeze(-1)  # (batch, seq, 1)
            predicted = probs.gather(2, target_skills_expanded).squeeze(-1)    # (batch, seq)

            # Create mask for valid timesteps
            mask = torch.zeros_like(predicted)
            for i in range(batch_size):
                valid_len = min(lengths[i].item(), seq_len)
                mask[i, :valid_len] = 1.0

            # Compute masked loss
            loss_all = criterion(predicted, target_labels[:, :seq_len])
            loss = (loss_all * mask).sum() / mask.sum()

            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
            optimizer.step()

            epoch_loss += loss.item() * mask.sum().item()
            epoch_count += mask.sum().item()

        avg_loss = epoch_loss / max(epoch_count, 1)
        elapsed = time.time() - start_time

        # Evaluate
        test_auc = compute_auc(model, test_loader, num_skills, device)
        
        marker = ""
        if test_auc > best_auc:
            best_auc = test_auc
            marker = "  ← best"

        print(f"  Epoch {epoch:2d}/{EPOCHS} | Loss: {avg_loss:.4f} | Test AUC: {test_auc:.4f} | Time: {elapsed:.1f}s{marker}")

    print("-" * 60)
    print(f"[DKT] Best Test AUC: {best_auc:.4f}")

    # Save model
    os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)
    torch.save({
        'model_state_dict': model.state_dict(),
        'num_skills': num_skills,
        'hidden_size': HIDDEN_SIZE,
        'skill_map': skill_map,
    }, MODEL_SAVE_PATH)
    print(f"[DKT] Model saved to {MODEL_SAVE_PATH}")


if __name__ == '__main__':
    train()

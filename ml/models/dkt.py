"""
Deep Knowledge Tracing (DKT) Model

LSTM-based sequence model for predicting student knowledge mastery.
Based on Piech et al. (2015) "Deep Knowledge Tracing".

Input:  Sequence of one-hot encoded (skill_id, correctness) pairs
Output: Probability of answering the next question correctly per skill
"""

import torch
import torch.nn as nn


class DKTModel(nn.Module):
    """
    Deep Knowledge Tracing using an LSTM.

    Encoding scheme:
        - Input dimension = 2 * num_skills
        - If the student answered skill k correctly:   one-hot at index k
        - If the student answered skill k incorrectly: one-hot at index (num_skills + k)
    """

    def __init__(self, num_skills: int, hidden_size: int = 128, num_layers: int = 1, dropout: float = 0.2):
        super().__init__()
        self.num_skills = num_skills
        self.hidden_size = hidden_size
        self.input_size = 2 * num_skills  # correct + incorrect encodings

        self.lstm = nn.LSTM(
            input_size=self.input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )

        self.dropout = nn.Dropout(dropout)
        self.output_layer = nn.Linear(hidden_size, num_skills)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x: torch.Tensor, lengths: torch.Tensor | None = None) -> torch.Tensor:
        """
        Args:
            x: Input tensor of shape (batch_size, seq_len, 2 * num_skills)
            lengths: Optional tensor of actual sequence lengths for packing

        Returns:
            Predicted probabilities of shape (batch_size, seq_len, num_skills)
        """
        if lengths is not None:
            # Pack padded sequences for efficient LSTM processing
            packed = nn.utils.rnn.pack_padded_sequence(
                x, lengths.cpu(), batch_first=True, enforce_sorted=False
            )
            lstm_out, _ = self.lstm(packed)
            lstm_out, _ = nn.utils.rnn.pad_packed_sequence(lstm_out, batch_first=True)
        else:
            lstm_out, _ = self.lstm(x)

        lstm_out = self.dropout(lstm_out)
        logits = self.output_layer(lstm_out)
        probabilities = self.sigmoid(logits)

        return probabilities


def encode_interaction(skill_id: int, correct: bool, num_skills: int) -> list[float]:
    """Encode a single interaction into a one-hot vector of size 2 * num_skills."""
    vec = [0.0] * (2 * num_skills)
    if correct:
        vec[skill_id] = 1.0
    else:
        vec[num_skills + skill_id] = 1.0
    return vec

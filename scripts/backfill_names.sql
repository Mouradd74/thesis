-- Script to backfill Egyptian names for older profiles that don't have a name properly stored.
-- You can simply copy and paste this entire block into the Supabase SQL Editor on your dashboard and hit "Run".

-- 1. Ensure the column exists (just in case it was entirely missing from your original schema)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='full_name') THEN
        ALTER TABLE profiles ADD COLUMN full_name text;
    END IF;
END $$;

-- 2. Backfill null values with randomly assigned Egyptian names
DO $$ 
DECLARE
    r RECORD;
    egyptian_names text[] := ARRAY[
        'Ahmed Hassan', 'Mohamed Ali', 'Mahmoud Saeed', 'Omar Farouk', 
        'Amira Yousef', 'Fatma Ibrahim', 'Khaled Mostafa', 'Mona Zaki', 
        'Nour El-Sherif', 'Yasmine Abdel Aziz', 'Tarek El-Sawy', 'Dina Gamal', 
        'Youssef Nabil', 'Kareem Ahmed', 'Rana Magdy', 'Hoda Shaarawy',
        'Naguib Mahfouz', 'Taha Hussein', 'Sara El-Kady', 'Nadia Lotfy'
    ];
BEGIN
    -- Loop through all existing profiles where the full name hasn't been set yet
    FOR r IN SELECT id FROM profiles WHERE full_name IS NULL LOOP
        UPDATE profiles 
        SET full_name = egyptian_names[floor(random() * array_length(egyptian_names, 1) + 1)]
        WHERE id = r.id;
    END LOOP;
END $$;

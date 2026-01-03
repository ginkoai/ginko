-- Fix: Add FK from team_members.user_id to user_profiles.id
-- This enables Supabase joins via the relationship

-- Add foreign key if user_profiles exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    -- First check if the FK already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'team_members_user_id_fkey_profiles'
      AND table_name = 'team_members'
    ) THEN
      ALTER TABLE public.team_members
      ADD CONSTRAINT team_members_user_id_fkey_profiles
      FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

      RAISE NOTICE 'Added FK from team_members.user_id to user_profiles.id';
    ELSE
      RAISE NOTICE 'FK already exists';
    END IF;
  ELSE
    RAISE NOTICE 'user_profiles table does not exist';
  END IF;
END $$;

-- Similarly for team_invitations inviter_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'team_invitations_inviter_id_fkey_profiles'
      AND table_name = 'team_invitations'
    ) THEN
      ALTER TABLE public.team_invitations
      ADD CONSTRAINT team_invitations_inviter_id_fkey_profiles
      FOREIGN KEY (inviter_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

      RAISE NOTICE 'Added FK from team_invitations.inviter_id to user_profiles.id';
    END IF;
  END IF;
END $$;

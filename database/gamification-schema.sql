-- WatchHill Gamification Database Schema
-- Tracks user progression, achievements, and collaboration metrics

-- User progression table
CREATE TABLE IF NOT EXISTS user_progression (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  title VARCHAR(100) DEFAULT 'Apprentice',
  skill_level VARCHAR(50) DEFAULT 'beginner',
  gamification_mode VARCHAR(50) DEFAULT 'balanced',
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_vibechecks INTEGER DEFAULT 0,
  total_handoffs INTEGER DEFAULT 0,
  total_commits INTEGER DEFAULT 0,
  last_session_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  xp_reward INTEGER DEFAULT 0,
  rarity VARCHAR(20) CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  category VARCHAR(50) CHECK (category IN ('learning', 'collaboration', 'productivity', 'mastery', 'community')),
  unlock_condition JSONB,
  celebration_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User achievements (many-to-many)
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  achievement_id VARCHAR(100) REFERENCES achievements(id),
  unlocked_at TIMESTAMP DEFAULT NOW(),
  session_id VARCHAR(100),
  metadata JSONB,
  UNIQUE(user_id, achievement_id)
);

-- Collaboration patterns created by users
CREATE TABLE IF NOT EXISTS collaboration_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name VARCHAR(200) NOT NULL,
  description TEXT,
  pattern_type VARCHAR(50),
  created_by UUID REFERENCES auth.users(id),
  team_id UUID,
  usage_count INTEGER DEFAULT 0,
  effectiveness_score DECIMAL(3,2),
  pattern_definition JSONB,
  coaching_hint TEXT,
  is_public BOOLEAN DEFAULT false,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Session metrics for pattern analysis
CREATE TABLE IF NOT EXISTS session_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_ms BIGINT,
  
  -- Phase tracking
  planning_duration_ms BIGINT DEFAULT 0,
  implementing_duration_ms BIGINT DEFAULT 0,
  debugging_duration_ms BIGINT DEFAULT 0,
  reviewing_duration_ms BIGINT DEFAULT 0,
  flow_duration_ms BIGINT DEFAULT 0,
  
  -- Metrics
  error_count INTEGER DEFAULT 0,
  commit_count INTEGER DEFAULT 0,
  vibecheck_count INTEGER DEFAULT 0,
  pattern_spotted_count INTEGER DEFAULT 0,
  search_count INTEGER DEFAULT 0,
  context_switches INTEGER DEFAULT 0,
  
  -- Scores
  collaboration_score INTEGER,
  handoff_quality_score INTEGER,
  communication_clarity_score INTEGER,
  productivity_score INTEGER,
  
  -- Pattern detection
  patterns_detected JSONB,
  achievements_unlocked JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Daily quests
CREATE TABLE IF NOT EXISTS daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_name VARCHAR(200) NOT NULL,
  description TEXT,
  challenge TEXT NOT NULL,
  reward_xp INTEGER DEFAULT 0,
  reward_type VARCHAR(50),
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category VARCHAR(50),
  active_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User quest progress
CREATE TABLE IF NOT EXISTS user_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  quest_id UUID REFERENCES daily_quests(id),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  progress DECIMAL(3,2) DEFAULT 0,
  metadata JSONB,
  UNIQUE(user_id, quest_id)
);

-- Team leaderboards
CREATE TABLE IF NOT EXISTS team_leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  leaderboard_type VARCHAR(50) NOT NULL,
  time_period VARCHAR(20) CHECK (time_period IN ('daily', 'weekly', 'monthly', 'all-time')),
  rankings JSONB, -- Array of {user_id, score, rank}
  generated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, leaderboard_type, time_period)
);

-- Skill progression tracking
CREATE TABLE IF NOT EXISTS skill_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  skill_name VARCHAR(100) NOT NULL,
  skill_category VARCHAR(50),
  current_level INTEGER DEFAULT 1,
  xp_in_skill INTEGER DEFAULT 0,
  unlocked_abilities JSONB,
  last_practiced TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, skill_name)
);

-- Coaching hints history
CREATE TABLE IF NOT EXISTS coaching_hints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100),
  user_id UUID REFERENCES auth.users(id),
  hint_type VARCHAR(50),
  hint_message TEXT,
  context JSONB,
  was_helpful BOOLEAN,
  feedback TEXT,
  displayed_at TIMESTAMP DEFAULT NOW()
);

-- Insert default achievements
INSERT INTO achievements (id, name, description, icon, xp_reward, rarity, category, celebration_message) VALUES
  ('first-vibecheck', 'First Recalibration', 'Called your first vibecheck', '🎯', 50, 'common', 'learning', 'Nice! You''ve learned when to pause and reassess.'),
  ('flow-initiate', 'Flow Initiate', 'Maintained flow state for 15 minutes', '🌊', 75, 'common', 'productivity', 'You''re finding your rhythm!'),
  ('context-keeper', 'Context Keeper', 'Created 5 session handoffs', '📚', 100, 'common', 'collaboration', 'Great job maintaining context!'),
  ('pattern-spotter', 'Pattern Spotter', 'Recognized stuck pattern before system hint', '🔍', 150, 'uncommon', 'learning', 'Impressive! You saw that coming before I did.'),
  ('debug-detective', 'Debug Detective', 'Solved 10 errors systematically', '🕵️', 200, 'uncommon', 'mastery', 'Your debugging skills are improving rapidly!'),
  ('commit-champion', 'Commit Champion', 'Made 50 meaningful commits', '💾', 175, 'uncommon', 'productivity', 'Excellent commit discipline!'),
  ('flow-master', 'Flow Master', 'Maintained flow state for 2 hours', '🌊', 300, 'rare', 'productivity', 'You''re in the zone! Perfect collaboration rhythm.'),
  ('collaboration-expert', 'Collaboration Expert', 'Achieved 90% collaboration score', '🤝', 350, 'rare', 'collaboration', 'Outstanding human-AI collaboration!'),
  ('pattern-creator', 'Pattern Creator', 'Shared a custom pattern with the community', '🧙', 500, 'epic', 'community', 'Your wisdom helps everyone! Pattern added to library.'),
  ('mentor', 'Mentor', 'Helped 5 other developers improve', '🎓', 600, 'epic', 'community', 'You''re making the community better!'),
  ('mind-meld', 'Mind Meld', 'Completed complex task with zero misalignment', '🧠', 1000, 'legendary', 'mastery', 'Legendary! Perfect human-AI synchronization achieved.'),
  ('rubber-duck', 'Rubber Duck Debugging', 'Solved problem by explaining it clearly', '🦆', 150, 'uncommon', 'learning', 'You solved it by explaining! Classic rubber duck debugging.')
ON CONFLICT (id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked_at ON user_achievements(unlocked_at);
CREATE INDEX idx_session_metrics_user_id ON session_metrics(user_id);
CREATE INDEX idx_session_metrics_session_id ON session_metrics(session_id);
CREATE INDEX idx_session_metrics_start_time ON session_metrics(start_time);
CREATE INDEX idx_collaboration_patterns_created_by ON collaboration_patterns(created_by);
CREATE INDEX idx_collaboration_patterns_team_id ON collaboration_patterns(team_id);
CREATE INDEX idx_coaching_hints_session_id ON coaching_hints(session_id);
CREATE INDEX idx_coaching_hints_user_id ON coaching_hints(user_id);

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_progression_updated_at BEFORE UPDATE ON user_progression
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaboration_patterns_updated_at BEFORE UPDATE ON collaboration_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_metrics_updated_at BEFORE UPDATE ON session_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skill_progression_updated_at BEFORE UPDATE ON skill_progression
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON user_progression TO authenticated;
GRANT ALL ON achievements TO authenticated;
GRANT ALL ON user_achievements TO authenticated;
GRANT ALL ON collaboration_patterns TO authenticated;
GRANT ALL ON session_metrics TO authenticated;
GRANT ALL ON daily_quests TO authenticated;
GRANT ALL ON user_quest_progress TO authenticated;
GRANT ALL ON team_leaderboards TO authenticated;
GRANT ALL ON skill_progression TO authenticated;
GRANT ALL ON coaching_hints TO authenticated;
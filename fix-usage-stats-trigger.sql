-- Fix the duplicate column assignment in track_session_event function
-- This fixes the "multiple assignments to same column 'usage_stats'" error

-- Replace the trigger function that has duplicate usage_stats assignments
CREATE OR REPLACE FUNCTION public.track_session_event()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.session_analytics (session_id, user_id, event_type, event_data)
        VALUES (NEW.id, NEW.user_id, 'created', jsonb_build_object('title', NEW.title));
        
        -- Update user usage stats (fixed: combine both updates into single jsonb_set operation)
        UPDATE public.user_profiles 
        SET usage_stats = jsonb_set(
            jsonb_set(
                COALESCE(usage_stats, '{}'), 
                '{sessions_created}', 
                to_jsonb(COALESCE((usage_stats->>'sessions_created')::int, 0) + 1)
            ),
            '{last_active}', 
            to_jsonb(NOW())
        )
        WHERE id = NEW.user_id;
        
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO public.session_analytics (session_id, user_id, event_type, event_data)
        VALUES (NEW.id, NEW.user_id, 'updated', jsonb_build_object(
            'old_title', OLD.title,
            'new_title', NEW.title
        ));
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================================
-- SUPABASE SNIPPET: RELEASE ALL STALE BROWSER LOCKS & FLEET RESET
-- Description: Unsticks browser profiles and worker leases that were locked
--              during sudden crashes, disconnected daemon sessions, or local testing.
-- Usage: Execute in Supabase Studio SQL Editor to immediately clear locks.
-- ============================================================================

DO $$
DECLARE
    v_unlocked_profiles INT := 0;
    v_stale_workers     INT := 0;
BEGIN
    -- 1. Reset profiles locked or stuck in 'running' / 'syncing'
    UPDATE browsers.profiles
    SET status = 'idle',
        locked_by_device_id = NULL,
        locked_at = NULL
    WHERE status IN ('running', 'syncing')
       OR locked_by_device_id IS NOT NULL;
    
    GET DIAGNOSTICS v_unlocked_profiles = ROW_COUNT;

    -- 2. Clean up worker devices status if workers schema is active
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'workers' AND table_name = 'devices') THEN
        UPDATE workers.devices
        SET status = 'idle'
        WHERE status = 'busy';
        
        GET DIAGNOSTICS v_stale_workers = ROW_COUNT;
    END IF;

    RAISE NOTICE '=======================================================';
    RAISE NOTICE ' [SUCCESS] Fleet Reset & Lock Reclamation Finished:';
    RAISE NOTICE '  - Browser Profiles Unlocked : %', v_unlocked_profiles;
    RAISE NOTICE '  - Busy Worker Devices Reset : %', v_stale_workers;
    RAISE NOTICE '=======================================================';
END $$;

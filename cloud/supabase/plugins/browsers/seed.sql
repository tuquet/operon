-- ============================================================================
-- OPN-CLOUD PLUGIN: BROWSERS SEED DATA
-- Description: Seeds authentic releases from adryfish/fingerprint-chromium
--              and baseline fingerprint templates
-- ============================================================================

-- 1. Releases Catalog
INSERT INTO browsers.releases (
    version, tag, channel, status, os_platform, arch,
    asset_name, download_url, file_size_bytes, is_recommended, notes, published_at
)
VALUES 
    -- 148.0.7778.215 (Golden LTS)
    (
        '148.0.7778.215', '148.0.7778.215', 'lts', 'recommended', 'windows', 'x86_64',
        'ungoogled-chromium_148.0.7778.215-1.1_windows_x64.zip',
        'https://github.com/adryfish/fingerprint-chromium/releases/download/148.0.7778.215/ungoogled-chromium_148.0.7778.215-1.1_windows_x64.zip',
        189767686, true,
        'Golden LTS Release: Zero canvas readback crashes, realistic WebGL GPU parameter simulation, randomized 8/16/32 GB device memory.',
        '2026-06-21T04:34:00Z'
    ),
    (
        '148.0.7778.215', '148.0.7778.215', 'lts', 'recommended', 'linux', 'x86_64',
        'ungoogled-chromium-148.0.7778.215-1-x86_64_linux.tar.xz',
        'https://github.com/adryfish/fingerprint-chromium/releases/download/148.0.7778.215/ungoogled-chromium-148.0.7778.215-1-x86_64_linux.tar.xz',
        141269020, true,
        'Golden LTS Release: Zero canvas readback crashes, realistic WebGL GPU parameter simulation, randomized 8/16/32 GB device memory.',
        '2026-06-21T04:34:00Z'
    ),
    (
        '148.0.7778.215', '148.0.7778.215', 'lts', 'recommended', 'macos', 'x86_64',
        'ungoogled-chromium_148.0.7778.215-1.1_macos.dmg',
        'https://github.com/adryfish/fingerprint-chromium/releases/download/148.0.7778.215/ungoogled-chromium_148.0.7778.215-1.1_macos.dmg',
        140187500, true,
        'Golden LTS Release: Zero canvas readback crashes, realistic WebGL GPU parameter simulation, randomized 8/16/32 GB device memory.',
        '2026-06-21T04:34:00Z'
    ),
    -- 150.0.7871.186 (Latest - Buggy)
    (
        '150.0.7871.186', '150.0.7871.186', 'latest', 'buggy', 'windows', 'x86_64',
        'ungoogled-chromium_150.0.7871.186-1.1_windows_x64.zip',
        'https://github.com/adryfish/fingerprint-chromium/releases/download/150.0.7871.186/ungoogled-chromium_150.0.7871.186-1.1_windows_x64.zip',
        193743241, false,
        'Upstream regression: SIGSEGV / Crashpad_NotConnectedToHandler in getImageData() / readPixels() (Issues #94 & #95). Not recommended for production.',
        '2026-10-02T14:02:29Z'
    ),
    (
        '150.0.7871.186', '150.0.7871.186', 'latest', 'buggy', 'linux', 'x86_64',
        'ungoogled-chromium-150.0.7871.186-1-x86_64_linux.tar.xz',
        'https://github.com/adryfish/fingerprint-chromium/releases/download/150.0.7871.186/ungoogled-chromium-150.0.7871.186-1-x86_64_linux.tar.xz',
        145806232, false,
        'Upstream regression: SIGSEGV in getImageData() / readPixels(). Not recommended for production.',
        '2026-10-02T14:02:29Z'
    ),
    -- 144.0.7559.132 (Archive - Deprecated)
    (
        '144.0.7559.132', '144.0.7559.132', 'archive', 'deprecated', 'windows', 'x86_64',
        'ungoogled-chromium_144.0.7559.132-1.1_windows_x64.zip',
        'https://github.com/adryfish/fingerprint-chromium/releases/download/144.0.7559.132/ungoogled-chromium_144.0.7559.132-1.1_windows_x64.zip',
        176796270, false,
        'Introduced realistic WebGL parameter simulation. Deprecated manual --fingerprint-gpu-vendor.',
        '2026-02-27T09:02:24Z'
    ),
    (
        '144.0.7559.132', '144.0.7559.132', 'archive', 'deprecated', 'linux', 'x86_64',
        'ungoogled-chromium-144.0.7559.132-1-x86_64_linux.tar.xz',
        'https://github.com/adryfish/fingerprint-chromium/releases/download/144.0.7559.132/ungoogled-chromium-144.0.7559.132-1-x86_64_linux.tar.xz',
        133493680, false,
        'Introduced realistic WebGL parameter simulation. Deprecated manual --fingerprint-gpu-vendor.',
        '2026-02-27T09:02:24Z'
    )
ON CONFLICT (version, channel, os_platform, arch) DO UPDATE SET
    download_url = EXCLUDED.download_url,
    asset_name = EXCLUDED.asset_name,
    file_size_bytes = EXCLUDED.file_size_bytes,
    is_recommended = EXCLUDED.is_recommended,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes;

-- 2. Baseline Fingerprint Templates
INSERT INTO browsers.fingerprint_templates (
    name, is_system, os_platform, os_version, browser_brand, engine_version,
    screen_width, screen_height, device_pixel_ratio, cpu_cores, ram_gb,
    user_agent, sec_ch_ua, sec_ch_ua_platform
)
SELECT 
    'Standard Windows 11 Desktop (1080p, 8-Core, 16GB)', true,
    'windows', '10.0.0', 'Chrome', '148.0.7778.215',
    1920, 1080, 1.0, 8, 16,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.215 Safari/537.36',
    '"Chromium";v="148", "Not A(Brand";v="24", "Google Chrome";v="148"',
    '"Windows"'
WHERE NOT EXISTS (
    SELECT 1 FROM browsers.fingerprint_templates WHERE name = 'Standard Windows 11 Desktop (1080p, 8-Core, 16GB)'
);

INSERT INTO browsers.fingerprint_templates (
    name, is_system, os_platform, os_version, browser_brand, engine_version,
    screen_width, screen_height, device_pixel_ratio, cpu_cores, ram_gb,
    user_agent, sec_ch_ua, sec_ch_ua_platform
)
SELECT 
    'Retina macOS Sonoma Desktop (1440p, 10-Core, 16GB)', true,
    'macos', '14.5.0', 'Chrome', '148.0.7778.215',
    2560, 1440, 2.0, 10, 16,
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.215 Safari/537.36',
    '"Chromium";v="148", "Not A(Brand";v="24", "Google Chrome";v="148"',
    '"macOS"'
WHERE NOT EXISTS (
    SELECT 1 FROM browsers.fingerprint_templates WHERE name = 'Retina macOS Sonoma Desktop (1440p, 10-Core, 16GB)'
);

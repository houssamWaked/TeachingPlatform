alter table public.capture_events
  drop constraint if exists capture_events_capture_type_check;

alter table public.capture_events
  add constraint capture_events_capture_type_check check (capture_type in (
    'SCREEN_SHARING_DETECTED', 'SCREEN_SHARING_ENDED', 'UNKNOWN_CAPTURE_SUSPICION',
    'SCREENSHOT_DETECTED', 'SCREENSHOT_SHORTCUT_OBSERVED', 'SCREEN_RECORDING_DETECTED',
    'SCREEN_MIRRORING_DETECTED', 'PROTECTION_OVERLAY_ACTIVATED'
  ));

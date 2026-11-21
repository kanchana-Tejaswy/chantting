-- Allow internal relative avatar paths (/media/...) in addition to https?:// schemes
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_avatar_url_safe,
  ADD CONSTRAINT profiles_avatar_url_safe
    CHECK (
      avatar_url IS NULL OR (
        (avatar_url ~ '^https?://' OR (avatar_url ~ '^/' AND avatar_url !~ '^//'))
        AND char_length(avatar_url) <= 1024
      )
    );

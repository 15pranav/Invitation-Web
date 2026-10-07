declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_EMAILS?: string;
    ADMIN_PASSWORD?: string;
  }
}
declare namespace Cloudflare {
  interface Env {
    MEDIA_AUDIO_MAX_MB?: string;
    MEDIA_IMAGE_MAX_MB?: string;
    MEDIA_VIDEO_MAX_MB?: string;
    R2_UPLOAD_ACCOUNT_ID?: string;
    R2_UPLOAD_BUCKET?: string;
    R2_UPLOAD_ACCESS_KEY_ID?: string;
    R2_UPLOAD_SECRET_ACCESS_KEY?: string;
  }
}

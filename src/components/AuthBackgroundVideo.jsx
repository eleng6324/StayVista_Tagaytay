function AuthBackgroundVideo({ videoId, title }) {
  const videoUrl =
    `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&modestbranding=1&rel=0`;

  return (
    <div className="auth-video-layer" aria-hidden="true">
      <iframe
        className="auth-video-frame"
        src={videoUrl}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <div className="auth-video-tint" />
    </div>
  );
}

export default AuthBackgroundVideo;

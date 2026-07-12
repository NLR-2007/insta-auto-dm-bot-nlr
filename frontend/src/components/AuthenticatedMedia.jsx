import React, { useEffect, useState } from "react";
import { getToken } from "../api";

export default function AuthenticatedMedia({ src, as = "img", alt = "", ...props }) {
  const [objectUrl, setObjectUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let localUrl = "";
    setFailed(false);
    fetch(src, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((response) => {
        if (!response.ok) throw new Error(`Media request failed (${response.status})`);
        return response.blob();
      })
      .then((blob) => {
        localUrl = URL.createObjectURL(blob);
        if (active) setObjectUrl(localUrl);
      })
      .catch(() => active && setFailed(true));
    return () => { active = false; if (localUrl) URL.revokeObjectURL(localUrl); };
  }, [src]);

  if (failed) return <div className="media-load-error">Preview unavailable</div>;
  if (!objectUrl) return <div className="media-loading-shimmer" />;
  if (as === "video") return <video src={objectUrl} {...props} />;
  if (as === "audio") return <audio src={objectUrl} {...props} />;
  return <img src={objectUrl} alt={alt} {...props} />;
}

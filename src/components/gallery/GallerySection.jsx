import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { galleryItems } from "../../data/galleryItems";

export default function GallerySection() {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const lightboxOpen = lightboxIndex !== null;

  function closeLightbox() {
    setLightboxIndex(null);
  }

  function showPrevious() {
    setLightboxIndex((current) => (current === 0 ? galleryItems.length - 1 : current - 1));
  }

  function showNext() {
    setLightboxIndex((current) => (current === galleryItems.length - 1 ? 0 : current + 1));
  }

  useEffect(() => {
    if (!lightboxOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    }

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  const lightbox = lightboxOpen ? (
    <div className="lightbox open" aria-hidden="false">
      <div className="lb-backdrop" onClick={closeLightbox}></div>

      <div className="lb-panel" role="dialog" aria-modal="true" aria-label="Gallery image viewer">
        <button className="lb-close" type="button" aria-label="Close viewer" onClick={closeLightbox}>
          ✕
        </button>

        <button
          className="lb-nav lb-prev"
          type="button"
          aria-label="Previous image"
          onClick={showPrevious}
        >
          ‹
        </button>

        <button
          className="lb-nav lb-next"
          type="button"
          aria-label="Next image"
          onClick={showNext}
        >
          ›
        </button>

        <figure className="lb-figure">
          <img src={galleryItems[lightboxIndex].src} alt={galleryItems[lightboxIndex].title} />

          <figcaption className="lb-cap">
            <span>{galleryItems[lightboxIndex].title}</span>
            <span>
              {lightboxIndex + 1} / {galleryItems.length}
            </span>
          </figcaption>
        </figure>
      </div>
    </div>
  ) : null;

  return (
    <>
      <section id="gallery">
        <div className="section-title">
          <h2>Gallery</h2>
          <span>Meet some of the CryptoPittz.</span>
        </div>

        <div className="gallery" aria-label="CryptoPittz Gallery">
          {galleryItems.map((item, index) => (
            <div
              key={item.src}
              className="tile tile-img"
              style={{
                "--img": `url("${item.src}")`,
                cursor: "pointer",
              }}
              onClick={() => setLightboxIndex(index)}
            >
              <div className="cap">{item.title}</div>
            </div>
          ))}
        </div>
      </section>

      {lightbox && createPortal(lightbox, document.body)}
    </>
  );
}

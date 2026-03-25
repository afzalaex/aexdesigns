"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./HomepageLayout.module.css";

const CONTACT_EMAIL = "afzalaex@gmail.com";
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

type HomepageCollabFormProps = {
  ariaLabel?: string;
  className?: string;
  children?: ReactNode;
  dialogTitle?: string;
  style?: CSSProperties;
};

export function HomepageCollabForm({
  ariaLabel,
  className,
  children,
  dialogTitle = "Contact",
  style,
}: HomepageCollabFormProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [idea, setIdea] = useState("");
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error" | null>(null);
  const buttonClassName = className ?? styles.contactButton;
  const buttonLabel = children ?? "Contact";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function handleOpen() {
    setStatusMessage(null);
    setStatusTone(null);
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
    setIsSubmitting(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (website.trim().length > 0) {
      setStatusTone("success");
      setStatusMessage("Sent.");
      setName("");
      setEmail("");
      setIdea("");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setStatusTone(null);

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: idea.trim(),
          _subject: `Collab idea from ${name.trim() || "website visitor"}`,
          _replyto: email.trim(),
          _template: "table",
        }),
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      setStatusTone("success");
      setStatusMessage("Sent.");
      setName("");
      setEmail("");
      setIdea("");
      setWebsite("");
    } catch {
      setStatusTone("error");
      setStatusMessage("Could not send right now. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        aria-label={ariaLabel}
        className={buttonClassName}
        style={style}
        type="button"
        onClick={handleOpen}
      >
        {buttonLabel}
      </button>

      {isOpen
        ? createPortal(
            <div className={styles.contactOverlay} role="presentation" onClick={handleClose}>
              <div
                className={styles.contactModal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="homepage-contact-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className={styles.contactModalHeader}>
                  <div className={styles.contactModalCopy}>
                    <p id="homepage-contact-title" className={styles.mailBoxTitle}>
                      {dialogTitle}
                    </p>
                  </div>
                  <button
                    className={styles.contactClose}
                    type="button"
                    aria-label="Close contact form"
                    onClick={handleClose}
                  />
                </div>

                <form className={styles.mailBox} onSubmit={handleSubmit}>
                  <label className={styles.honeypotField} aria-hidden="true" tabIndex={-1}>
                    <span className={styles.fieldLabel}>Website</span>
                    <input
                      className={styles.fieldInput}
                      type="text"
                      name="website"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                      autoComplete="off"
                      tabIndex={-1}
                    />
                  </label>

                  <div className={styles.fieldGrid}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Name</span>
                      <input
                        className={styles.fieldInput}
                        type="text"
                        name="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        autoComplete="name"
                        required
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Email</span>
                      <input
                        className={styles.fieldInput}
                        type="email"
                        name="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        required
                      />
                    </label>
                  </div>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>What&apos;s your idea about?</span>
                      <textarea
                        className={`${styles.fieldInput} ${styles.fieldTextarea}`}
                        name="idea"
                        value={idea}
                        onChange={(event) => setIdea(event.target.value)}
                        required
                      />
                  </label>

                  <div className={styles.mailBoxFooter}>
                    <button className={styles.mailBoxButton} type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Sending..." : "Send"}
                    </button>
                    {statusMessage ? (
                      <p
                        className={`${styles.formStatus} ${
                          statusTone === "error" ? styles.formStatusError : styles.formStatusSuccess
                        }`}
                        role={statusTone === "error" ? "alert" : "status"}
                      >
                        {statusMessage}
                      </p>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

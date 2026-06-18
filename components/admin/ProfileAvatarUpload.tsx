"use client";

import { useEffect, useId, useRef } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

export const PROFILE_PLACEHOLDER_SRC = "/profile.jpg";

export const PROFILE_AVATAR_SIZE_CLASS = "h-24 w-24";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ProfileAvatarUpload({
  imageUrl,
  onImageChange,
  alt,
  className,
}: {
  imageUrl?: string | null;
  onImageChange?: (url: string | null) => void;
  alt: string;
  className?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handleFileChange(file: File | undefined) {
    if (!file || !onImageChange) return;
    if (!file.type.startsWith("image/")) return;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }
    const nextUrl = URL.createObjectURL(file);
    blobUrlRef.current = nextUrl;
    onImageChange(nextUrl);
  }

  const displaySrc = imageUrl?.trim() || PROFILE_PLACEHOLDER_SRC;
  const canUpload = Boolean(onImageChange);

  return (
    <div className={cx("relative shrink-0", className)}>
      <div
        className={cx(
          PROFILE_AVATAR_SIZE_CLASS,
          "relative overflow-hidden rounded-full bg-[#E7E7E7]",
          canUpload && "group cursor-pointer",
        )}
        onClick={canUpload ? openFilePicker : undefined}
        onKeyDown={
          canUpload
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openFilePicker();
                }
              }
            : undefined
        }
        role={canUpload ? "button" : undefined}
        tabIndex={canUpload ? 0 : undefined}
        aria-label={canUpload ? `Upload photo for ${alt}` : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={displaySrc} alt={alt} className="h-full w-full object-cover" />
        {canUpload ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-mgmt-inverse-surface/20 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <MaterialSymbol name="photo_camera" className="text-white" />
          </div>
        ) : null}
      </div>

      {canUpload ? (
        <>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              handleFileChange(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={openFilePicker}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-mgmt-on-surface text-white shadow-md transition-transform hover:scale-105"
            aria-label={`Upload photo for ${alt}`}
          >
            <MaterialSymbol name="photo_camera" className="text-[16px]" />
          </button>
        </>
      ) : null}
    </div>
  );
}

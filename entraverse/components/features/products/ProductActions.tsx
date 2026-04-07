"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface ProductActionsProps {
  productId: string;
  productName: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type MenuPosition = {
  left: number;
  top: number;
};

export default function ProductActions({
  productId,
  productName,
  onEdit,
  onDelete,
  isOpen,
  onOpenChange,
}: ProductActionsProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ left: 8, top: 8 });
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const closeMenu = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current || !menuRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = buttonRect.right - menuRect.width;
    let top = buttonRect.bottom + 8;

    if (left + menuRect.width > viewportWidth) {
      left = viewportWidth - menuRect.width - 16;
    }
    if (top + menuRect.height > viewportHeight) {
      top = buttonRect.top - menuRect.height - 8;
    }

    setMenuPosition({
      left: Math.max(8, left),
      top: Math.max(8, top),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const rafId = window.requestAnimationFrame(() => {
      updateMenuPosition();
      setFocusedIndex(0);
      itemRefs.current[0]?.focus();
    });

    const onWindowChange = () => updateMenuPosition();
    window.addEventListener("resize", onWindowChange);
    window.addEventListener("scroll", onWindowChange, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("scroll", onWindowChange, true);
    };
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeMenu, isOpen]);

  const menuItems = useMemo(
    () => [
      {
        label: "Edit",
        icon: Pencil,
        action: () => {
          onEdit(productId);
          closeMenu();
        },
        className: "text-slate-700 hover:bg-slate-50 hover:text-blue-600",
      },
      {
        label: "Delete",
        icon: Trash2,
        action: () => {
          onDelete(productId);
          closeMenu();
        },
        className: "text-rose-600 hover:bg-rose-50",
      },
    ],
    [closeMenu, onDelete, onEdit, productId]
  );

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (menuItems.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = (focusedIndex + 1) % menuItems.length;
      setFocusedIndex(next);
      itemRefs.current[next]?.focus();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = (focusedIndex - 1 + menuItems.length) % menuItems.length;
      setFocusedIndex(next);
      itemRefs.current[next]?.focus();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setFocusedIndex(0);
      itemRefs.current[0]?.focus();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const last = menuItems.length - 1;
      setFocusedIndex(last);
      itemRefs.current[last]?.focus();
      return;
    }

    if (event.key === "Tab") {
      closeMenu();
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenChange(!isOpen);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        aria-label={`Aksi untuk ${productName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {isOpen ? (
                <motion.div
                  ref={menuRef}
                  role="menu"
                  aria-label={`Menu aksi ${productName}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14 }}
                  onKeyDown={onMenuKeyDown}
                  style={{ left: menuPosition.left, top: menuPosition.top }}
                  className="fixed z-30 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                  {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        ref={(node) => {
                          itemRefs.current[index] = node;
                        }}
                        type="button"
                        role="menuitem"
                        tabIndex={focusedIndex === index ? 0 : -1}
                        onMouseEnter={() => setFocusedIndex(index)}
                        onClick={item.action}
                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition ${item.className}`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </>
  );
}

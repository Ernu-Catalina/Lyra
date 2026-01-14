// components/molecules/ContextMenuTrigger.tsx
import { type MouseEvent, useState } from "react";
import styles from "./ContextMenuTrigger.module.css";

interface MenuItem {
  label: string;
  onClick: () => void;       
  danger?: boolean;
}

interface ContextMenuTriggerProps {
  children: React.ReactNode;
  menuItems: MenuItem[];       
}

export type { MenuItem };

export function ContextMenuTrigger({ children, menuItems }: ContextMenuTriggerProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setShow(true);
  };

  const handleClickOutside = () => setShow(false);

  return (
    <div
      onContextMenu={handleContextMenu}
      style={{ position: "relative", display: "inline-block" }}
    >
      {children}

      {show && (
        <>
          <div className={styles.backdrop} onClick={handleClickOutside} />
          <div
            className={styles.menu}
            style={{ top: position.y, left: position.x }}
          >
            {menuItems.map((item, i) => (
              <button
                key={i}
                className={`${styles.item} ${item.danger ? styles.danger : ""}`}
                onClick={() => {
                  item.onClick();
                  setShow(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
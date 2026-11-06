/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { ReactDOM, useEffect, useState } from "@webpack/common";

import style from "./style.css?managed";

const HeaderIcon = findComponentByCodeLazy("tooltipPosition:", '"aria-haspopup":', '"data-jump-section":');

interface ToggleProps {
    collapsed: boolean;
    onToggle(): void;
}

let active = false;
let lastToggle: ToggleProps | undefined;
const activeListeners = new Set<(active: boolean) => void>();

function setActive(value: boolean) {
    active = value;
    for (const listener of activeListeners) listener(value);
}

/** Find the leading flex group of Discord's main page header. */
function findHeader(root: Element): HTMLElement | null {
    const page = root.querySelector(".page__5e434");
    if (!page) return null;

    return page.querySelector<HTMLElement>(".container__9293f .children__9293f")
        ?? page.querySelector<HTMLElement>(".header__1add6, .headerBar__8a7fc");
}

function SidebarIcon({ collapsed, className, color }: { collapsed: boolean; className?: string; color?: string; }) {
    return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2.25" stroke={color ?? "currentColor"} strokeWidth="1.8" />
            <path d="M9.25 5v14" stroke={color ?? "currentColor"} strokeWidth="1.8" />
            <path d={collapsed ? "m13 9 3 3-3 3" : "m16 9-3 3 3 3"} stroke={color ?? "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function SidebarControl(props: ToggleProps) {
    const [isActive, setIsActive] = useState(active);
    const [target, setTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        activeListeners.add(setIsActive);
        setIsActive(active);
        return () => { activeListeners.delete(setIsActive); };
    }, []);

    useEffect(() => {
        if (!isActive) return;
        lastToggle = props;
        return () => {
            if (lastToggle === props) lastToggle = undefined;
        };
    }, [isActive, props]);

    useEffect(() => {
        if (!isActive) {
            setTarget(null);
            return;
        }

        const root = document.querySelector("#app-mount .base__5e434");
        if (!root) return;

        let current: HTMLElement | null = null;
        let path = window.location.pathname;
        let frame = 0;

        const sync = () => {
            frame = 0;
            current = findHeader(root);
            path = window.location.pathname;
            setTarget(current);
        };

        const observer = new MutationObserver(() => {
            if (current?.isConnected && path === window.location.pathname) return;
            if (!frame) frame = requestAnimationFrame(sync);
        });

        observer.observe(root, { childList: true, subtree: true });
        sync();
        return () => {
            observer.disconnect();
            if (frame) cancelAnimationFrame(frame);
        };
    }, [isActive]);

    // If a Discord page has no supported header, never leave the sidebar stuck closed.
    useEffect(() => {
        if (!isActive || !props.collapsed || target?.isConnected) return;
        const timer = setTimeout(() => {
            try { props.onToggle(); } catch (error) { console.error("SidebarToggle: could not restore sidebar", error); }
        }, 2000);
        return () => clearTimeout(timer);
    }, [isActive, props.collapsed, props.onToggle, target]);

    if (!isActive || !target) return null;
    const label = props.collapsed ? "Show channel sidebar" : "Hide channel sidebar";

    return ReactDOM.createPortal(
        <HeaderIcon
            className="vc-sidebar-toggle"
            icon={(iconProps: { className?: string; color?: string; }) => <SidebarIcon {...iconProps} collapsed={props.collapsed} />}
            tooltip={label}
            role="button"
            aria-label={label}
            aria-expanded={!props.collapsed}
            onClick={() => {
                try { props.onToggle(); } catch (error) { console.error("SidebarToggle: could not toggle sidebar", error); }
            }}
        />,
        target
    );
}

export default definePlugin({
    name: "SidebarToggle",
    description: "Collapse and restore the channel sidebar from the page header.",
    // A zero ID keeps credit visible without publishing a personal Discord ID.
    authors: [{ name: "Kevin-Ebrahim", id: 0n }],
    tags: ["Appearance", "Utility"],

    patches: [{
        find: "Resize Sidebar",
        group: true,
        replacement: [
            {
                match: /(\i=\i\(\i=>!\i\.isOpen\))&&!1(?=,\i=\i\(\i=>\i\.width\))/,
                replace: "$1"
            },
            {
                match: /("data-collapsed":(\i),className:.{0,650}?"aria-label":"Resize Sidebar".{0,250}?onClick:(\i),onMouseDown:\i,onKeyDown:\i\}\)\}\),)/,
                replace: "$1$self.renderToggle({collapsed:$2,onToggle:$3}),"
            }
        ]
    }],

    renderToggle: ErrorBoundary.wrap(SidebarControl, {
        noop: true,
        onError: ({ props }) => {
            if (props.collapsed) {
                try { props.onToggle(); } catch (error) { console.error("SidebarToggle: could not restore sidebar", error); }
            }
        }
    }),

    start() {
        enableStyle(style);
        setActive(true);
    },

    stop() {
        if (lastToggle?.collapsed) {
            try { lastToggle.onToggle(); } catch (error) { console.error("SidebarToggle: could not restore sidebar", error); }
        }
        lastToggle = undefined;
        setActive(false);
        disableStyle(style);
    }
});

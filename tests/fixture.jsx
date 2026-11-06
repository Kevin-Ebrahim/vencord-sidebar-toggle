import * as React from "react";
import { createRoot } from "react-dom/client";
import plugin from "../src/sidebarToggle/index";

// The plugin normally receives React from Vencord's build-time JSX shim.
window.React = React;

function Shell() {
    const [collapsed, setCollapsed] = React.useState(false);
    const toggle = React.useCallback(() => setCollapsed(value => !value), []);

    return (
        <div className="sidebar__5e434" data-collapsed={String(collapsed)}>
            <div className="guilds">
                <div className="server-icon active-server">S</div>
                <div className="server-icon">W</div>
                <div className="server-icon">+</div>
            </div>
            <div className="sidebarList__5e434">
                <div className="sidebar-heading">Studio space <span>⌄</span></div>
                <div className="sidebar-category">CHANNELS</div>
                <div className="channel selected"># &nbsp; general</div>
                <div className="channel"># &nbsp; ideas</div>
                <div className="channel"># &nbsp; updates</div>
            </div>
            <section className="panels__5e434">
                <div className="container__37e49">
                    <button className="accountPopoutButtonWrapper__37e49">K</button>
                    <span className="account-name">You</span>
                    <span className="buttons__37e49"><button>⋯</button></span>
                </div>
            </section>
            {plugin.renderToggle({ collapsed, onToggle: toggle })}
        </div>
    );
}

plugin.start();
createRoot(document.getElementById("sidebar-root")).render(<Shell />);
window.sidebarTest = { stop: () => plugin.stop() };

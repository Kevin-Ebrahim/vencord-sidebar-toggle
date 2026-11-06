const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");
const puppeteer = require("puppeteer-core");

const root = path.resolve(__dirname, "..");
const pluginCss = fs.readFileSync(path.join(root, "src/sidebarToggle/style.css"), "utf8");
const css = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #10141b; color: #dce0e8; font: 16px system-ui, sans-serif;
    --background-modifier-hover: #ffffff1a; --background-base-low: #232a34; --custom-guild-list-width: 72px; }
  .base__5e434 { display: flex; height: 500px; }
  .sidebar__5e434 { display: flex; width: 300px; height: 100%; background: #202630; position: relative; }
  .sidebar__5e434[data-collapsed="true"] { width: 72px; }
  .guilds { width: 72px; flex: none; padding: 18px 12px; background: #191e26; }
  .server-icon { display: grid; place-items: center; width: 44px; height: 44px; margin-bottom: 12px; border-radius: 14px; background: #303947; color: #bac7d8; font-weight: 700; }
  .active-server { background: #6978df; color: white; }
  .sidebarList__5e434 { flex: 1; padding: 0 12px; }
  .sidebar-heading { height: 56px; display: flex; align-items: center; justify-content: space-between; font-weight: 650; }
  .sidebar-category { margin: 24px 6px 12px; font-size: 11px; font-weight: 700; letter-spacing: .09em; color: #909ba9; }
  .channel { color: #aab3c0; padding: 8px 10px; border-radius: 6px; }
  .channel.selected { background: #343d4a; color: #f1f4fa; }
  .panels__5e434 { position: absolute; bottom: 8px; left: 4px; width: 290px; background: #303947; border-radius: 8px; }
  .container__37e49 { display: flex; align-items: center; height: 48px; gap: 10px; padding: 4px 10px; }
  .container__37e49 button { background: #6374c4; color: white; border: 0; border-radius: 50%; width: 34px; height: 34px; }
  .account-name { flex: 1; font-size: 14px; }
  .sidebar__5e434[data-collapsed="true"] .panels__5e434:not(:hover):not(:focus-within) .account-name { display: none; }
  .buttons__37e49 button { background: #414c5c; }
  .page__5e434 { flex: 1; min-width: 0; }
  .container__9293f, .header__1add6, .headerBar__8a7fc { display: flex; align-items: center; height: 56px; padding: 8px 16px; background: #252b35; color: #dce0e8; }
  .children__9293f { align-items: center; display: flex; flex: 1; min-width: 0; overflow: hidden; }
  .header__1add6 { background: #9638b0; color: white; }
  .headerBar__8a7fc { background: #28539a; color: white; gap: 20px; }
  .navBar__131a1 { background: #ba48cd; color: white; padding: 0; }
  .navBarContent__131a1 { align-items: center; display: flex; height: 100%; padding: 0 16px; width: 100%; }
  .iconWrapper__9293f { display: flex; position: relative; align-items: center; justify-content: center; width: 32px; height: 32px; border: 0; padding: 0; background: transparent; cursor: pointer; }
  .icon__9293f { width: 24px; height: 24px; }
  .title { white-space: nowrap; }
  .toolbar { margin-left: auto; }
  .content { padding: 30px 32px; color: #c5ccd7; }
  .day { color: #8d99aa; text-align: center; font-size: 12px; margin-bottom: 32px; }
  .message { display: flex; gap: 14px; margin-bottom: 24px; line-height: 1.5; }
  .avatar { flex: none; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 50%; color: white; background: #8975b8; font-weight: 700; }
  .avatar.second { background: #579690; }
  .message strong { color: #f2f4fa; font-size: 14px; }
  .message small { margin-left: 8px; color: #8793a3; }
  .message p { margin: 2px 0 0; font-size: 14px; }
`;

const stubs = {
    "@utils/types": "export default value => value;",
    "@components/ErrorBoundary": "export default { wrap: component => component };",
    "@api/Styles": `export function enableStyle(css) {
      const node = document.createElement('style'); node.id = 'plugin-style'; node.textContent = css; document.head.append(node);
    }
    export function disableStyle() { document.getElementById('plugin-style')?.remove(); }`,
    "@webpack/common": `export { useEffect, useState } from 'react'; export * as ReactDOM from 'react-dom';`,
    "@webpack": `import React from 'react';
      export function findComponentByCodeLazy() {
        return function HeaderIcon({ className, icon: Icon, tooltip, onClick, role, ...aria }) {
          return React.createElement('button', { className: className + ' iconWrapper__9293f clickable__9293f',
            title: tooltip, onClick, role, ...aria }, React.createElement(Icon, { className: 'icon__9293f', color: 'currentColor' }));
        };
      }`
};

async function main() {
    const bundle = await esbuild.build({
        entryPoints: [path.join(__dirname, "fixture.jsx")],
        bundle: true,
        write: false,
        platform: "browser",
        format: "iife",
        jsxFactory: "React.createElement",
        plugins: [{
            name: "vencord-test-stubs",
            setup(build) {
                build.onResolve({ filter: /^@/ }, args => ({ path: args.path, namespace: "stub" }));
                build.onResolve({ filter: /style\.css\?managed$/ }, () => ({ path: "css", namespace: "stub" }));
                build.onLoad({ filter: /.*/, namespace: "stub" }, args => ({
                    contents: args.path === "css" ? `export default ${JSON.stringify(pluginCss)};` : stubs[args.path],
                    loader: "js",
                    resolveDir: root
                }));
            }
        }]
    });

    const executablePath = process.env.CHROME_PATH || "/usr/bin/chromium";
    const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1100, height: 500 });
        const header = `<div class="container__9293f"><div class="children__9293f"><span class="title"># general</span></div><div class="toolbar">Search</div></div>`;
        await page.setContent(`<style>${css}</style><div id="app-mount"><div class="base__5e434"><div id="sidebar-root"></div><main class="page__5e434">${header}<div class="content"><div class="day">TODAY</div><div class="message"><div class="avatar">A</div><div><strong>Alex</strong><small>10:24</small><p>There's more room for the conversation now.</p></div></div><div class="message"><div class="avatar second">J</div><div><strong>Jordan</strong><small>10:26</small><p>And the sidebar is one click away when we need it.</p></div></div></div></main></div></div>`);
        await page.addScriptTag({ content: bundle.outputFiles[0].text });

        const button = ".vc-sidebar-toggle";
        await page.waitForSelector(button);
        assert.equal(await page.$eval(button, el => el.getAttribute("aria-expanded")), "true");
        assert.equal(await page.$eval(button, el => el.getAttribute("aria-label")), "Hide channel sidebar");
        const spacing = await page.evaluate(() => {
            const toggle = document.querySelector(".vc-sidebar-toggle").getBoundingClientRect();
            const title = document.querySelector(".title").getBoundingClientRect();
            return title.left - toggle.right;
        });
        assert(spacing >= 4 && spacing <= 8, `unexpected title spacing: ${spacing}px`);
        if (process.env.SIDEBAR_DEMO_PATH) await page.screenshot({ path: process.env.SIDEBAR_DEMO_PATH });
        const initialLeft = await page.$eval(".page__5e434", el => el.getBoundingClientRect().left);

        await page.click(button);
        await page.waitForFunction(() => document.querySelector(".vc-sidebar-toggle")?.getAttribute("aria-expanded") === "false");
        const collapsedLeft = await page.$eval(".page__5e434", el => el.getBoundingClientRect().left);
        assert(initialLeft - collapsedLeft > 200, "collapsing should give the page more space");
        assert.equal(await page.$eval(".sidebarList__5e434", el => getComputedStyle(el).display), "none");
        assert.equal(await page.$eval(button, el => el.getAttribute("aria-label")), "Show channel sidebar");
        if (process.env.SIDEBAR_COLLAPSED_DEMO_PATH) await page.screenshot({ path: process.env.SIDEBAR_COLLAPSED_DEMO_PATH });

        await page.hover(".panels__5e434");
        assert((await page.$eval(".panels__5e434", el => el.getBoundingClientRect().width)) >= 290, "account panel should expand on hover");
        await page.mouse.move(1090, 490);
        await page.focus(".accountPopoutButtonWrapper__37e49");
        assert.notEqual(await page.$eval(".buttons__37e49", el => getComputedStyle(el).display), "none", "account controls should be reachable on focus");

        await page.$eval(".page__5e434", el => { el.innerHTML = `<div class="navBar__131a1 container__9293f"><div class="children__9293f"><div class="navBarContent__131a1"><span class="title">Nitro</span></div></div></div>`; });
        await page.waitForFunction(() => document.querySelector(".navBar__131a1 .vc-sidebar-toggle"));
        const nitroSpacing = await page.evaluate(() => {
            const header = document.querySelector(".navBar__131a1").getBoundingClientRect();
            const toggle = document.querySelector(".vc-sidebar-toggle").getBoundingClientRect();
            const logo = document.querySelector(".navBarContent__131a1 .title").getBoundingClientRect();
            return { inset: toggle.left - header.left, gap: logo.left - toggle.right };
        });
        assert.equal(nitroSpacing.inset, 16, "Nitro should use the same leading inset as other headers");
        assert.equal(nitroSpacing.gap, 4, "Nitro's own padding should not add extra space after the toggle");
        if (process.env.SIDEBAR_NITRO_DEMO_PATH) await page.screenshot({ path: process.env.SIDEBAR_NITRO_DEMO_PATH });

        for (const [selector, color] of [["header__1add6", "rgb(150, 56, 176)"], ["headerBar__8a7fc", "rgb(40, 83, 154)"]]) {
            await page.$eval(".page__5e434", (el, cls) => { el.innerHTML = `<div class="${cls}"><span class="title">Home</span></div>`; }, selector);
            await page.waitForFunction(cls => document.querySelector(`.${cls} .vc-sidebar-toggle`), {}, selector);
            assert.equal(await page.$eval(`.${selector}`, el => getComputedStyle(el).backgroundColor), color);
            assert.equal(await page.$eval(button, el => getComputedStyle(el).color), "rgb(255, 255, 255)");
            assert.equal(await page.$eval(button, el => el.getAttribute("aria-expanded")), "false");
            const gap = await page.evaluate(() => document.querySelector(".title").getBoundingClientRect().left - document.querySelector(".vc-sidebar-toggle").getBoundingClientRect().right);
            assert.equal(gap, 4, `${selector} should leave 4px after the toggle`);
        }

        await page.click(button);
        await page.waitForFunction(() => document.querySelector(".sidebar__5e434")?.dataset.collapsed === "false");
        await page.click(button);
        await page.waitForFunction(() => document.querySelector(".sidebar__5e434")?.dataset.collapsed === "true");
        await page.$eval(".page__5e434", el => { el.innerHTML = "<div>Unsupported page</div>"; });
        await page.waitForFunction(() => document.querySelector(".sidebar__5e434")?.dataset.collapsed === "false", { timeout: 5000 });

        await page.$eval(".page__5e434", (el, html) => { el.innerHTML = html; }, header);
        await page.waitForSelector(button);
        await page.click(button);
        await page.waitForFunction(() => document.querySelector(".sidebar__5e434")?.dataset.collapsed === "true");
        await page.evaluate(() => window.sidebarTest.stop());
        await page.waitForFunction(() => document.querySelector(".sidebar__5e434")?.dataset.collapsed === "false");
        await page.waitForFunction(() => !document.querySelector(".vc-sidebar-toggle"));
        assert.equal(await page.$("#plugin-style"), null);
        console.log(`Passed: header spacing, collapse (+${initialLeft - collapsedLeft}px), account controls, colored headers, page changes, recovery and disable.`);
    } finally {
        await browser.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });

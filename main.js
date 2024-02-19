import expressApp from './App.js';
import fs from "fs";
import {createRequire} from 'module';
import {
    defaultPath,
    notepadOpen,
    chromePath,
    licensePath,
    isDev,
    getNumberKoreanDate
} from "./src/utils/common.js";

const require = createRequire(import.meta.url);
const {app, Tray, Menu, BrowserWindow} = require('electron/main');
const electronLocalShortcut = require('electron-localshortcut');
const CryptoJS = require("crypto-js");

let mainWindow;
let tray

const browserOption = {
    width          : 1720,
    height         : 860,
    minWidth       : 1440,
    minHeight      : 600,
    webPreferences : {
        nodeIntegration: true,
    },
    resizable      : true,
    autoHideMenuBar: true,
    show           : false,
    y              : 0,
    x              : 0,
    title          : 'S'
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
    app.exit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized() || !mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
        }
    });
}

const createFile = (filePath) => {
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // 파일이 없는 경우
            fs.writeFile(filePath, '', (writeErr) => {});
        }
    });
}

const licenseValidate = async () => {
    try {
        const koreaDateNumber = await getNumberKoreanDate();
        const licenseKey = fs.readFileSync(licensePath, 'utf-8');
        const bytes  = CryptoJS.AES.decrypt(licenseKey, process.env.ENCRYPTION_KEY);
        const licenseDateNumber = bytes.toString(CryptoJS.enc.Utf8);

        return koreaDateNumber > licenseDateNumber;

    } catch (e) {
        return true;
    }
}

const createWindow = async () => {
    mainWindow = new BrowserWindow(browserOption);
    expressApp.listen(3001);
    // mainWindow.webContents.openDevTools({mode: 'detach'});
    if (isDev) {
        if (await licenseValidate()) {
            await mainWindow.loadURL(`file://${defaultPath}/build/index.html#/license`);
        } else {
            await mainWindow.loadFile(`${defaultPath}/build/index.html`);
            mainWindow.webContents.openDevTools({mode: 'detach'});
        }
    } else {
        if (await licenseValidate()) {
            await mainWindow.loadURL(`file://${defaultPath}/build/index.html#/license`);
        } else {
            await mainWindow.loadFile(`${defaultPath}/build/index.html`);
        }
    }
    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        electronLocalShortcut.register(mainWindow, 'F5', () => {
            // mainWindow.webContents.reloadIgnoringCache();
            mainWindow.reload();
        });
    });
}

const createTray = () => {
    tray = new Tray(`${defaultPath}/src/assets/images/logo.png`);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '도움말',
            click: async () => {
                const manualWindow = new BrowserWindow(browserOption);
                await manualWindow.loadURL('https://thoracic-spring-58d.notion.site/29bb6d7c62584007ad8fa895f5e89973?pvs=4');
                manualWindow.show();
            },
        },
        {
            label: '크롬경로입력',
            click: () => {
                notepadOpen(chromePath);
            },
        },
        {
            label: '라이센스입력',
            click: () => {
                notepadOpen(licensePath);
            },
        },
        {
            label: '재시작',
            click: () => {
                app.exit();
                app.relaunch();
            },
        },
        {
            label: '종료',
            click: () => {
                app.isQuiting = true;
                app.quit();
            },
        },
    ]);

    tray.setToolTip('Seller Supporter');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        mainWindow.show();
    });

    mainWindow.on('close', function (event) {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

app.on('ready', () => {
    createFile(chromePath);
    createFile(licensePath);
    createWindow();
    createTray();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
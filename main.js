import expressApp from './App.js';
import fs from "fs";
import {createRequire} from 'module';
import {
    defaultPath,
    notepadOpen,
    chromePath,
    licensePath,
    isDev,
    manualLink
} from "./src/utils/common.js";


const require = createRequire(import.meta.url);
const {app, Tray, Menu, BrowserWindow} = require('electron/main');
const electronLocalShortcut = require('electron-localshortcut');

let mainWindow, tray;

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

export let manualWindow;

const createFile = (filePath) => {
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // 파일이 없는 경우
            fs.writeFile(filePath, '', (writeErr) => {
            });
        }
    });
}

const createWindow = async () => {
    mainWindow = new BrowserWindow(browserOption);
    manualWindow = new BrowserWindow(browserOption);

    await manualWindow.loadURL(manualLink);
    expressApp.listen(3001);
    if (isDev) {
        await mainWindow.loadFile(`${defaultPath}/build/index.html`);
        mainWindow.webContents.openDevTools({mode: 'detach'});
    } else {
        await mainWindow.loadFile(`${defaultPath}/build/index.html`);
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
        electronLocalShortcut.register(mainWindow, 'Ctrl+F12', () => {
            mainWindow.webContents.openDevTools({mode: 'detach'});
        });
    });
}

const createTray = () => {
    tray = new Tray(`${defaultPath}/src/assets/images/logo.png`);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '도움말',
            click: async () => {
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

    manualWindow.on('close', function (event) {
        if (!app.isQuiting) {
            event.preventDefault();
            manualWindow.hide();
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
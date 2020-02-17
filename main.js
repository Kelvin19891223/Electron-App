const { app, BrowserWindow,ipcMain } = require('electron')
const mysql = require('mysql')
var fs = require('fs')
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
var error = null
function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1024,
    height: 800,
    webPreferences: {
      nodeIntegration: true,      
    },
    transparent: true, 
    frame: false
    //frame: false
  })

  // and load the index.html of the app.
  win.loadFile('index.html')

  // Open the DevTools.
  //win.webContents.openDevTools()
  
  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
  
  win.removeMenu()
}

setTimeout(function() {
    getSetting()
},500);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

var con = null

function getSetting()
{
    fs.readFile('setting.txt', function (err, data) {
        var server = ""
        var user = ""
        var password = ""
        var database = ""
        var setting
        if (err) {
            //error = err
            //create a file
            fs.appendFile("setting.txt",'server:188.213.28.170\nuser:aston\npassword:Aston!#@%213\ndatabase:aston',function(err) {
                server="188.213.28.170";
                user="aston";
                password="aston";
                database="aston";

                try {
                    con = mysql.createConnection({
                        host: server,
                        user: user,
                        password: password,
                        database: database
                    })
                
                    con.connect(function(err) {
                        if(err) {
                            error = err
                            win.webContents.send("Error", "Can not connect to the database. Please change the setting.txt.")                        
                            return
                        }
                        
                        win.webContents.send("Error", "Empty")
                        
                    })
                } catch(err) {
                    win.webContents.send("Error", "Error")
                }                
            })                        
            return;
        } 
        
        setting = data.toString().split('\n')  
        for(var i=0; i<setting.length; i++) {
            if(setting[i].indexOf("server") == 0)
            {
                server = setting[i].replace('server:','').replace('\r','')   
            }
            if(setting[i].indexOf("user") == 0)
            {
                user = setting[i].replace('user:','').replace('\r','')   
            }
            if(setting[i].indexOf("password") == 0)
            {
                password = setting[i].replace('password:','').replace('\r','')   
            }
            if(setting[i].indexOf("database") == 0)
            {
                database = setting[i].replace('database:','').replace('\r','')   
            }
        }  

        try {
            con = mysql.createConnection({
                host: server,
                user: user,
                password: password,
                database: database
            })
        
            con.connect(function(err) {
                if(err) {                    
                    error = err
                    win.webContents.send("Error", "Can not connect to the database. Please change the setting.txt.")
                    return
                }
                //win.webContents.on('did-finish-load', () => {
                    win.webContents.send("Error", "Empty")
                //})
            })            
        } catch(err) {
            win.webContents.send("Error", "Error")
            error = err
        }
    });
}
// setTimeout(function() {
//     if(error == null)
//     {        
//         win.webContents.send("Error", "Empty")
//     } else 
//         win.webContents.send("Error", error)
// },3000)

ipcMain.on('read_data', async function(e,data)
{    
    if(error)
        win.webContents.send("Error", "Can not connect to the database. Please change the setting.txt.")
    else
        read_data()
})

function read_data()
{
    con.query("SELECT v.*, GROUP_CONCAT(b.brand) AS 'brand', GROUP_CONCAT(p.product) as 'product' FROM aston v left JOIN brand b ON (FIND_IN_SET(b.id, v.type_brand)) left JOIN product p ON (FIND_IN_SET(p.id, v.type_product)) GROUP BY v.id order by v.vendor_name", function(err, result, fields) {
        if(err) {
            win.webContents.send("Error", "Error")
            return
        }
        win.webContents.send("datatable_data", result)
    })

    con.query("SELECT * FROM brand order by brand", function(err, result, fields) {
        if(err) {
            win.webContents.send("Error", "Error")
            return
        }        
        win.webContents.send("brand", result)
    })

    con.query("SELECT * FROM product order by product", function(err, result, fields) {
        if(err) {
            win.webContents.send("Error", "Error")
            return
        }
        win.webContents.send("product", result)
    })
}

ipcMain.on('save_brand', async function(e,data)
{    
    con.query("insert into brand(brand) values('" + data + "')", function(err, result) {
        if(err) {
            win.webContents.send("Error", "Error")
            return
        }
        read_data()
    })
})

ipcMain.on('delete_brand', async function(e,data)
{    
    var ids = []
    for(var i=0; i<data.length; i++)
        ids.push(data[i].noIndex)
    
    con.query("delete from brand where id in (" + ids + ")", function(err, result) {
        if(err) {
            win.webContents.send("Error", "Error")
            return
        }
        con.query("delete from aston where type_brand in (" + ids + ")", function(err, result) {
            if(err) {
                win.webContents.send("Error", "Error")
                return
            }
            read_data()
        })        
    })
})

ipcMain.on('save_product', async function(e,data)
{    
    con.query("insert into product(product) values('" + data + "')", function(err, result) {
        if(err) {
            win.webContents.send("Error", "Error")
            return
        }
        read_data()
    })
})

ipcMain.on('delete_product', async function(e,data)
{    
    var ids = []
    for(var i=0; i<data.length; i++)
        ids.push(data[i].noIndex)
    
    con.query("delete from product where id in (" + ids + ")", function(err, result) {
        if(err) {
            win.webContents.send("Error", "Error")
            return
        }
        con.query("delete from aston where type_product in (" + ids + ")", function(err, result) {
            if(err) {
                win.webContents.send("Error", "Error")
                return
            }
            read_data()
        })        
    })
})

ipcMain.on('save_vendor', async function(e,data)
{    
    con.query("insert into aston(vendor_name,contact_name,email_address,telephone_number,website,note,official_distributor,type_brand,type_product) values ?", [data], function(err, result) {
        if(err) {
            win.webContents.send("Error", "Error")
            return
        }
        read_data()
    })
})

ipcMain.on('update_product', async function(e,data)
{    
    let param = [data.Name, data.id]
    con.query("update product set product=? where id=?", param, function(err, result) {
        if(err) {
            win.webContents.send("Error", "Error")
            return
        }
        read_data()
    })
})

ipcMain.on('update_brand', async function(e,data)
{    
    let param = [data.Name, data.id]
    con.query("update brand set brand=? where id=?", param, function(err, result) {
        if(err) {
            win.webContents.send("Error", "Error")
            return
        }
        read_data()
    })
})

ipcMain.on('delete_vendor', async function(e,data)
{    
    var ids = []
    for(var i=0; i<data.length; i++)
        ids.push(data[i].noIndex)
    con.query("delete from aston where id in (" + ids + ")", function(err, result) {
        if(err) {
            win.webContents.send("Error", "Error")
            return
        }
        read_data()
    })
})

ipcMain.on('update_vendor', async function(e,data)
{        
    let param = [data.vendor, data.contact, data.email, data.phone, data.website, data.note, data.distributor, data.brand, data.product, data.id]
    con.query("update aston set vendor_name=?, contact_name=?, email_address=?, telephone_number=?, website=?, note=?, official_distributor=?, type_brand=?, type_product=? where id=?", param, function(err, result) {
        if(err) {
            win.webContents.send("Error", "Error")
            return
        }
        read_data()
    })
})

const child_process = require("child_process");
swiplPath = child_process.execSync("where.exe swipl").toString()
console.log(swiplPath);
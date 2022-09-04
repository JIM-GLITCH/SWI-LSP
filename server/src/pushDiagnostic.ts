/**
 * 这个 文件里的四个函数用在各个文件 
 * */ 

import {  Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
export{
	warning,
	error,
	information,
	hint
};
interface hasDiagnostics{
	diagnostics:Diagnostic[]
}
function warning(range:Range,message:string,ctx:hasDiagnostics){
	ctx.diagnostics.push( {
		severity: DiagnosticSeverity.Warning,
		range: range,
		message: message??" ",
	});
}
function error(range:Range,message:string,ctx:hasDiagnostics){
	ctx.diagnostics.push( {
		severity: DiagnosticSeverity.Error,
		range: range,
		message: message??" ",
	});
}
function information(range:Range,message:string,ctx:hasDiagnostics){
	ctx.diagnostics.push( {
		severity: DiagnosticSeverity.Information,
		range: range,
		message: message??" ",
	});
}
function hint(range:Range,message:string,ctx:hasDiagnostics){
	ctx.diagnostics.push( {
		severity: DiagnosticSeverity.Hint,
		range: range,
		message: message??" ",
	});
}
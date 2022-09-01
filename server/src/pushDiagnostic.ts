/**
 * 这个 文件里的四个函数用在各个文件 
 * */ 

import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
export{
	warning,
	error,
	information,
	hint
};
function warning(range:Range,message?:string){
	return {
		severity: DiagnosticSeverity.Warning,
		range: range,
		message: message??" ",
	};
}
function error(range:Range,message?:string){
	return  {
		severity: DiagnosticSeverity.Error,
		range: range,
		message: message??" ",
	};
}
function information(range:Range,message?:string){
	return {
		severity: DiagnosticSeverity.Information,
		range: range,
		message: message??" ",
	};
}
function hint(range:Range,message?:string,source?:string){
	return{
		severity: DiagnosticSeverity.Hint,
		range: range,
		message: message??" ",
	};
}
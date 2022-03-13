/**
 * 这个 文件里的四个函数用在各个文件 
 * */ 

import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import { localDiagnostics } from './server';
export{
	pushWarning,
	pushError,
	pushInformation,
	pushHint
};
function pushWarning(range:Range,message?:string,source?:string){
	const diagnostic: Diagnostic = {
		severity: DiagnosticSeverity.Warning,
		range: range,
		message: message??" ",
		source: source
	};
	localDiagnostics.push(diagnostic);
}
function pushError(range:Range,message?:string,source?:string){
	const diagnostic: Diagnostic = {
		severity: DiagnosticSeverity.Error,
		range: range,
		message: message??" ",
		source: source
	};
	localDiagnostics.push(diagnostic);
}
function pushInformation(range:Range,message?:string,source?:string): void{
	const diagnostic: Diagnostic = {
		severity: DiagnosticSeverity.Information,
		range: range,
		message: message??" ",
		source: source
	};
	localDiagnostics.push(diagnostic);
}
function pushHint(range:Range,message?:string,source?:string){
	const diagnostic: Diagnostic = {
		severity: DiagnosticSeverity.Hint,
		range: range,
		message: message??" ",
		source: source
	};
	localDiagnostics.push(diagnostic);
}
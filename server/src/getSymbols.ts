
import { DocumentSymbol, SymbolKind } from 'vscode-languageserver';
import { AtomNode, ClauseNode, FunctorNode, InfixOpArgNode, PrefixOpArgNode } from './astNode';
import { getFunctorName } from './getFunctorName';
export{getSymbols};   
async function getSymbols(localClauses:ClauseNode[]): Promise<DocumentSymbol[]> {
	const symbols:DocumentSymbol[]=[];
	localClauses.forEach((val:ClauseNode,index)=>{
		const term = val.term;
		if (term ===undefined){
			undefined;
		}
		else if (term instanceof InfixOpArgNode){
				if(term.functor.functor==":-" 
				|| term.functor.functor=="-->"){
					const pred = term.left;
					let name="";
					if (pred instanceof AtomNode){
						if(term.functor.functor==":-" )
							name =pred.functor.functor;
						else
							name =pred.functor.functor+"//0"; 
					}
					else if(pred instanceof  FunctorNode){
						name = pred.functor.functor+trans(term.functor.functor) +pred.arity;
					}
					else if (pred instanceof InfixOpArgNode && pred.functor.functor==":"){
						const moduleName = pred.left.functor.functor;
						const predName = getFunctorName(pred.right);
						name = moduleName+":"+predName;
					}
						
					symbols.push({
						name:name,
						kind:SymbolKind.Function,
						range:pred.range,
						selectionRange:pred.range,
					});
			} 
		}
		else if (term instanceof PrefixOpArgNode){
			if(term.functor.functor==":-" ){
				const Arg = term.arg;
				if (Arg instanceof AtomNode){
					undefined;
				}
				else if ((Arg instanceof FunctorNode) || 
				( Arg instanceof PrefixOpArgNode)){
					const functor = Arg.functor;
					const str = functor.functor;
					symbols.push({
						name:str,
						kind:SymbolKind.Event,
						range:functor.range,
						selectionRange:functor.range,
					});
				}

			}
		}
		else if (term instanceof AtomNode){
			symbols.push({
				name:term.functor.functor,
				kind:SymbolKind.Function,
				range:term.range,
				selectionRange:term.range,
			});
		}
		else if (term instanceof FunctorNode){
			symbols.push({
				name:term.functor.functor+'/'+term.arity,
				kind:SymbolKind.Function,
				range:term.range,
				selectionRange:term.range,
			});
		}
		
	});
	return symbols;
}

function trans(functor: string) {
	switch (functor) {
		case ":-":
			return "/";
		case "-->":
			return "//";
		default:
			break;
	}
}

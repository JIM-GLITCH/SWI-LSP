import { AtomNode, FunctorNode } from './astNode';
import { token } from './lexer';
export{getFunctorName};
function getFunctorName(a:{kind:Kind}){
	switch (a.kind) {
		case Kind.AtomNode:
			return (a as AtomNode).functor.text;
		case Kind.FunctorNode:
			return (a as FunctorNode).functor.text;
		
		default:
			return " ";
	} 
}
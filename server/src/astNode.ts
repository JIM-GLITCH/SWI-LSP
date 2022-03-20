
import { SSL_OP_NO_TLSv1_2 } from 'constants';
import { Range } from 'vscode-languageserver';
import { token, tokenType } from './lexer';
export {
	VarNode, 
	NegativeNode, 
	FunctorNode, 
	AtomNode, 
	ListNode, 
	ParenNode, 
	StringNode, 
	CurlyNode, 
	BackQuotedNode, 
	InfixopNode, 
	PostfixopNode,
	InfixOpArgNode,
	CommaNode,
	SemicolonNode,
	PostfixOpArgNode,
	PrefixOpArgNode,
	ClauseNode,
	IntegerNode
};
function combineRange(r1: Range, r2: Range): Range {
	return { start: r1.start, end: r2.end };
}
class Node {
	range!: Range;
	fullRange!: Range ;
	kind!:Kind;
	functor: Node | token|undefined;
	constructor(start:{range:Range,fullRange:Range},end?:{range:Range,fullRange:Range}) {
		if (end===undefined && start !==undefined){
			this.range =start.range;
			this.fullRange=start.fullRange;
		}
		else if (start===undefined && end !==undefined){
			this.range =end.range;
			this.fullRange=end.fullRange;
		}
		else if (start!==undefined && end !==undefined){
			this.range = combineRange(start.range, end.range);
			this.fullRange = combineRange(start.fullRange, end.fullRange);
		}
	}
}
class VarNode extends Node {
	kind=Kind.VarNode;
	functor;
	constructor(vartoken: token) {
		super(vartoken);
		this.functor = vartoken;
	}
}

class NegativeNode extends Node {
	kind = Kind.NegativeNode;
	sign: token;
	number: token;
	constructor({ sign, integer }: { sign: token; integer: token; }) {
		super(sign,integer);
		this.sign = sign;
		this.number = integer;
	}
}
class FunctorNode extends Node {
	kind=Kind.FunctorNode;
	functor: token;
	// open: token;
	// close: token;
	arg1:ArgNode;
	arity:number;
	restArgs: AtomNode | ListNode;
	constructor(functor: token,Arg1: any,RestArgs:ListNode|AtomNode) {
		super(functor,RestArgs);
		this.functor = functor;
		if (RestArgs instanceof ListNode){
			this.arity=RestArgs.length+1;
		}
		else{
			this.arity=1;
		}
		this.arg1 =Arg1;
		this.restArgs = RestArgs;
	}
}
class IntegerNode extends Node{
	kind = Kind.IntegerNode;
	functor: token;
	constructor(head:token,tail?:token) {
		super(head,tail);
		this.functor = head;
	}
}
class AtomNode extends Node {
	kind = Kind.AtomNode;
	functor: token;
	constructor(head:token,tail?:token) {
		super(head,tail);
		this.functor = head;
	}
}
class StringNode extends Node {
	kind = Kind.StringNode;
	functor: token;
	constructor(string:token) {
		super(string);
		this.functor = string;
	}
}
class BackQuotedNode extends Node {
	kind = Kind.BackQuotedNode;
	functor: token;
	constructor(back_quoted_string: token) {
		super(back_quoted_string);
		this.functor = back_quoted_string;
	}
}

class ListNode extends Node {
	kind=Kind.ListNode;
	// openList: token;
	// closeList: token;
	left: any;
	right:any;
	length:number;
	//       [OpenList,Arg1,RestArgs]
	constructor(left:token,right:ListNode) {
		super(left,right);
		this.left= left;
		this.right = right;
		if (right instanceof AtomNode){
			this.length = 1;
		}else{
			this.length = 1+right.length;
		}
	}
}

class ParenNode extends Node {
	kind=Kind.ParenNode;
	open: token;
	close: token;
	term: any;
	constructor(ts:any) {
		super(ts);
		this.open = ts[0];
		this.close = ts[2];
		this.term = ts[1];
	}
}
class CurlyNode extends Node {
	// openCurly: token;
	// closeCurly: token;
	term: any;
	constructor(open:token,term:any,close:token) {
		super(open,close);
		// this.openCurly = ts[0];
		// this.closeCurly = ts[2];
		this.term = term;
	}
}

class opNode implements token {
	// token interface
	layout: string;
	functor: string;
	range: Range;
	fullRange: Range;
	kind: tokenType;
	next?: any;
	constructor(atom: token) {
		// token interface
		this.layout = atom.layout;
		this.functor = atom.functor;
		this.range = atom.range;
		this.fullRange = atom.fullRange;
		this.kind = atom.kind;
		this.next = atom.next;
	}
}

class InfixopNode extends opNode {
	kind=Kind.InfixopNode;
	// InfixNode
	precs: [number,number,number];

	constructor(atom: token, precs: [number, number, number]) {
		// token interface
		super(atom);
		// InfixNode
		this.precs = precs;

	}
}
class PostfixopNode extends opNode {
	kind=Kind.PostfixopNode;
	// PostfixopNode
	precs: [number,number];

	constructor(atom: token, precs: [number, number]) {
		// token interface
		super(atom);
		// PostfixopNode
		this.precs = precs;

	}
}
class InfixOpArgNode extends Node {
	kind=Kind.InfixOpArgNode;
	functor: token;
	left: ArgNode;
	right: Node;
	constructor(Term: FunctorNode | AtomNode , Op:any,Other:Node) {
		super(Term,Other);
		this.functor = Op;
		this.left = Term;
		this.right = Other;
	}
}
class CommaNode extends Node {
	kind=Kind.CommaNode;
	// comma: token;
	left: any;
	right: any;
	constructor(Term:any,Next:any) {
		super(Term,Next);
		// this.comma = tks[0];
		this.left = Term;
		this.right = Next;
	}
}

class SemicolonNode extends Node {
	kind=Kind.SemicolonNode;
	// semicolon: token;
	left: any;
	right: any;
	constructor(Term:any,Next:any) {
		super(Term,Next);
		// this.semicolon = tks[0];
		this.left = Term;
		this.right = Next;
	}
}
class PostfixOpArgNode extends Node {
	kind = Kind.PostfixOpArgNode;
	functor: token;
	arg: any;
	constructor(Op:any, Term:any) {
		super(Term,Op);
		this.functor = Op;
		this.arg = Term;
	}
}
type ArgNode = AtomNode|FunctorNode|PrefixOpArgNode|InfixOpArgNode|PostfixOpArgNode;
class PrefixOpArgNode extends Node{
	kind=Kind.PrefixOpArgNode;
	functor: token;
	arg: ArgNode;
	constructor(Op:any, Arg:any) {
		super(Op,Arg);
		this.functor = Op;
		this.arg = Arg;
	}
}
/**
 * ClauseNode 对应一个clause。
 * term, end 中有一个可能是undefined
 */
class ClauseNode extends Node{
	kind=Kind.ClauseNode;
	term?:Node;
	end?:token;
	constructor(Term:any,endToken?:token){
		super(Term,endToken);
		this.term = Term;
		this.end = endToken;
	}
}

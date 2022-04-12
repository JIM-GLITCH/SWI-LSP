
import { SSL_OP_NO_TLSv1_2 } from 'constants'
import { Agent } from 'https'
import { Range } from 'vscode-languageserver'
import { FileState } from './fileState'
import { Graph } from './graph'
import { token, tokenType } from './lexer'
export {
	Node,
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
	IntegerNode,
	KeyValueNode,
	CK,
	Semantic
}
interface Params {
	// varSet: Set<string>
	graph: Graph
}

function combineRange(r1: Range, r2: Range): Range {
	return { start: r1.start, end: r2.end }
}
/**clause Kind */
const enum CK {
	RULE = 1,
	DCG
}
const enum Semantic {
	Rule = 1,
	DCG,
	RuleHead,
	DCGHead,
	RuleBody,
	DCGBody,
	Arg,
	TopLevel,
	RuleEval
}
class Node {
	walk(level: number,  state: FileState) { };
	range!: Range
	fullRange!: Range
	kind!: Kind
	functor: Node | token | undefined
	constructor(start: { range: Range, fullRange: Range }, end?: { range: Range, fullRange: Range }) {
		if (end === undefined && start !== undefined) {
			this.range = start.range
			this.fullRange = start.fullRange
		}
		else if (start === undefined && end !== undefined) {
			this.range = end.range
			this.fullRange = end.fullRange
		}
		else if (start !== undefined && end !== undefined) {
			this.range = combineRange(start.range, end.range)
			this.fullRange = combineRange(start.fullRange, end.fullRange)
		}
	}
}
class VarNode extends Node {
	kind = Kind.VarNode;
	functor
	constructor(vartoken: token) {
		super(vartoken)
		this.functor = vartoken
	}
}

class NegativeNode extends Node {
	kind = Kind.NegativeNode;
	sign: token
	number: token
	constructor({ sign, integer }: { sign: token; integer: token }) {
		super(sign, integer)
		this.sign = sign
		this.number = integer
	}

}
class FunctorNode extends Node {
	kind = Kind.FunctorNode;
	functor: token
	// open: token;
	// close: token;
	arg1: ArgNode
	arity: number
	restArgs: AtomNode | ListNode
	constructor(functor: token, Arg1: ArgNode, RestArgs: ListNode | AtomNode) {
		super(functor, RestArgs)
		this.functor = functor
		if (RestArgs instanceof ListNode) {
			this.arity = RestArgs.length + 1
		}
		else {
			this.arity = 1
		}
		this.arg1 = Arg1
		this.restArgs = RestArgs
	}
	getArgs() {
		const args = [this.arg1]
		let p = this.restArgs
		for (; ;) {
			if (p instanceof ListNode) {
				args.push(p.left)
				p = p.right
				continue
			}
			else if (p instanceof AtomNode) {
				break
			}
		}
		return args
	}

}
class IntegerNode extends Node {
	kind = Kind.IntegerNode;
	functor: token
	constructor(head: token, tail?: token) {
		super(head, tail)
		this.functor = head
	}
}
const enum INFO{
	definition
}
class AtomNode extends Node {
	kind = Kind.AtomNode;
	functor: token
	constructor(head: token, tail?: token) {
		super(head, tail)
		this.functor = head
	}
	walk(level: number, state: FileState): void {
		switch (level) {
			
			case Semantic.TopLevel: {
				/* a.  addDefinition */
				const name = this.functor.text
				return state.graph.addDefinition(name, this)
			}
			case Semantic.RuleHead:{
				/*  a :- xxx.   addDefinition */
				const name = this.functor.text;
				return state.graph.addDefinition(name,this);
			}
			case Semantic.RuleBody:{
				/*  xxx :- a.  addReference*/
				const name = this.functor.text;
				return state.graph.addReference(name,this);
			}
			case Semantic.DCGHead:{
				/* a -> xxx. addDefinition */
				const name = this.functor.text+"/2";
				return state.graph.addDefinition(name,this);
			}
			case Semantic.DCGBody:{
				/* xxx --> a.  addReference*/
				const name = this.functor.text+"/2";
				return state.graph.addReference(name,this);
			}
			case Semantic.Arg:{
				/*  xxx --> a.  addReference*/
				const name = this.functor.text;
				return state.graph.addReference(name,this);
			}
			default:
				break 
		}
	}
}
class StringNode extends Node {
	kind = Kind.StringNode;
	functor: token
	constructor(string: token) {
		super(string)
		this.functor = string
	}
}
class BackQuotedNode extends Node {
	kind = Kind.BackQuotedNode;
	functor: token
	constructor(back_quoted_string: token) {
		super(back_quoted_string)
		this.functor = back_quoted_string
	}
}

class ListNode extends Node {
	kind = Kind.ListNode;
	// openList: token;
	// closeList: token;
	left: any
	right: any
	length: number
	//       [OpenList,Arg1,RestArgs]
	constructor(left: token, right: ListNode) {
		super(left, right)
		this.left = left
		this.right = right
		if (right instanceof AtomNode) {
			this.length = 1
		} else {
			this.length = 1 + right.length
		}
	}
	getArgs() {
		const args = [this.left]
		let p = this.right
		for (; ;) {
			if (p instanceof ListNode) {
				args.push(p.left)
				p = p.right
				continue
			}
			else if (p instanceof AtomNode) {
				break
			}
		}
		return args
	}
}

class ParenNode extends Node {
	kind = Kind.ParenNode;
	open: token
	close: token
	term: any
	constructor(ts: any) {
		super(ts)
		this.open = ts[0]
		this.close = ts[2]
		this.term = ts[1]
	}
}
class CurlyNode extends Node {
	// openCurly: token;
	// closeCurly: token;
	term: any
	constructor(open: token, term: any, close: token) {
		super(open, close)
		// this.openCurly = ts[0];
		// this.closeCurly = ts[2];
		this.term = term
	}
}

class opNode implements token {
	// token interface
	layout: string
	text: string
	range: Range
	fullRange: Range
	kind: tokenType
	next?: any
	constructor(atom: token) {
		// token interface
		this.layout = atom.layout
		this.text = atom.text
		this.range = atom.range
		this.fullRange = atom.fullRange
		this.kind = atom.kind
		this.next = atom.next
	}
}

class InfixopNode extends opNode {
	kind = Kind.InfixopNode;
	// InfixNode
	precs: [number, number, number]

	constructor(atom: token, precs: [number, number, number]) {
		// token interface
		super(atom)
		// InfixNode
		this.precs = precs

	}
}
class PostfixopNode extends opNode {
	kind = Kind.PostfixopNode;
	// PostfixopNode
	precs: [number, number]

	constructor(atom: token, precs: [number, number]) {
		// token interface
		super(atom)
		// PostfixopNode
		this.precs = precs

	}
}
class InfixOpArgNode extends Node {
	kind = Kind.InfixOpArgNode;
	functor: token
	left: ArgNode
	right: Node
	constructor(Term: FunctorNode | AtomNode, Op: any, Other: Node) {
		super(Term, Other)
		this.functor = Op
		this.left = Term
		this.right = Other
	}
}
class CommaNode extends Node {
	kind = Kind.CommaNode;
	// comma: token;
	left: any
	right: any
	constructor(Term: any, Next: any) {
		super(Term, Next)
		// this.comma = tks[0];
		this.left = Term
		this.right = Next
	}
}

class SemicolonNode extends Node {
	kind = Kind.SemicolonNode;
	// semicolon: token;
	left: any
	right: any
	constructor(Term: any, Next: any) {
		super(Term, Next)
		// this.semicolon = tks[0];
		this.left = Term
		this.right = Next
	}
}
class PostfixOpArgNode extends Node {
	kind = Kind.PostfixOpArgNode;
	functor: token
	arg: ArgNode
	constructor(Op: any, Term: any) {
		super(Term, Op)
		this.functor = Op
		this.arg = Term
	}
	walk(level: number, state: FileState): void {
		switch (level) {
			case Semantic.TopLevel:{
				/**xxx a.  addDefinition*/
				const name = this.functor+"/1";
				state.graph.addDefinition(name,this);
				return this.arg.walk(Semantic.Arg,state)
			}
			case Semantic.RuleHead:{

			}
			case Semantic.RuleBody:{

			}
			case Semantic.DCGHead:{

			}
			case Semantic.DCGBody:{

			}
			case Semantic.RuleEval:{

			}
			case Semantic.Arg:{
				
			}
			default:
				break;
		}
	}
}
type ArgNode = AtomNode | FunctorNode | PrefixOpArgNode | InfixOpArgNode | PostfixOpArgNode
class PrefixOpArgNode extends Node {
	kind = Kind.PrefixOpArgNode;
	functor: token
	arg: ArgNode
	constructor(Op: any, Arg: any) {
		super(Op, Arg)
		this.functor = Op
		this.arg = Arg
	}
	walk(level: number, state: FileState): void {
		switch (level) {
			case Semantic.TopLevel:{
				/** :- xxx. */
				if (this.functor.text == ":-") {
					return this.arg.walk(Semantic.RuleEval,  state)
				}
				/**a xxx.  addDefinition*/
				const name = this.functor.text+"/1";
				return state.graph.addDefinition(name,this);
			}
			case Semantic.RuleHead:{
				const name = this.functor.text+"/1";
				return state.graph.addDefinition(name,this);
			}
			case Semantic.RuleBody:{
				const name = this.functor.text+"/1";
				return state.graph.addReference(name,this);
			}
			case Semantic.DCGHead:{
				const name = this.functor.text+"/3";
				return state.graph.addDefinition(name,this);
			}
			case Semantic.DCGBody:{
				const name = this.functor.text+"/3";
				return state.graph.addReference(name,this);
			}
			case Semantic.RuleEval:{

			}
			default:
				break
		}
	}
}
/**
 * ClauseNode 对应一个clause。
 * term, end 中有一个可能是undefined
 */
class ClauseNode extends Node {
	kind = Kind.ClauseNode;
	term?: Node
	end?: token
	clauseKind?:CK;
	constructor(Term: any, endToken?: token) {
		super(Term, endToken)
		this.term = Term
		this.end = endToken
	}
	walk(level: number,  state: FileState): void {
		this.term?.walk(Semantic.Rule,  state)
	}
}
class KeyValueNode extends Node {
	Key: any
	Value: token
	constructor(Key: any, Value: token) {
		super(Key, Value)
		this.Key = Key
		this.Value = Value
	}
}

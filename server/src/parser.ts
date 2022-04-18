/**
 * 这个文件 参考 read.pl (dec-10 prolog)
 */
// import  lexerPeg = require("./lexerPeg");
import fs = require("fs")
import { AtomNode, BackQuotedNode, ClauseNode, CommaNode, FunctorNode, CurlyNode, InfixOpArgNode, InfixopToken, ListNode, NegativeNode, PostfixOpArgNode, PostfixopToken, PrefixOpArgNode, SemicolonNode, StringNode, VarNode, IntegerNode, KeyValueNode, Semantic, Node } from './astNode'
import { read_tokens, token, InputStream, stream, tokenType } from "./lexer"
import { OpTable } from './op_table'
import { pushError } from './pushDiagnostic'
import { Flag } from "./context_flags"
import { Graph } from './graph'
import { FileState } from './fileState'
export { Parser }
type opType = "fy" | "fx" | "xfy" | "xfx" | "yfx" | "yf" | "xf"
type commaToken = token;
type barToken = token;
function debug() {
	const fileString = fs.readFileSync("./server/src/test/3.pl").toString()
	const stream = InputStream(fileString)
	for (; ;) {
		if (stream.offset >= stream.text.length)
			break
		const tokens = read_tokens(stream)
		if (tokens === undefined)
			break
		const parser = new Parser()
		const Answer = parser.readClause(tokens)
		if (Answer === undefined)
			break
		console.log(Answer)
	}
}
// function parseText2(text:string) {
// 	const tokensList:token[][]=lexerPeg.parse(text);
// 	const clauses:ClauseNode[] = [];
// 	tokensList.map((tokens)=>{
// 		const Answer = readClause(tokens)
// 		if (Answer !== undefined)
// 			clauses.push(Answer);
// 		// postParse(Answer)
// 	})
// 	return clauses;
// }
class Parser {
	optable: OpTable
	graph: Graph
	fileState?:FileState;
	constructor(fileState?:FileState) {
		if(fileState){
			this.optable = fileState.opTable
			this.graph = fileState.graph;
			this.fileState = fileState;
		}else{
			this.optable = new OpTable()
			this.graph = new Graph()
		}
	}
	/** make a compatible fucntion*/
	parse(text:string){
		if(this.fileState){
			this.parseTextWithState(text);	
		}else{
			this.parseText(text);
		}
	}
	parseTextWithState(text: string){
		const clauses: ClauseNode[] = []
		const stream = InputStream(text)
		for (; ;) {
			if (stream.offset >= stream.text.length)
				break
			const tokens = read_tokens(stream)
			if (tokens === undefined)
				break
			const Answer = this.readClause(tokens)
			if (Answer !== undefined) {
				clauses.push(Answer)
				// this.optable.tryChangeOpTable(Answer)
				Answer.walk(Semantic.TopLevel,this.fileState!,{});
			}
			// postParse(Answer)

		}
		return clauses
	}
	/**@deprecated incremental parsing need a state */
	parseText(text: string) {
		const clauses: ClauseNode[] = []
		const stream = InputStream(text)
		for (; ;) {
			if (stream.offset >= stream.text.length)
				break
			const tokens = read_tokens(stream)
			if (tokens === undefined)
				break
			const Answer = this.readClause(tokens)
			if (Answer !== undefined) {
				clauses.push(Answer)
				this.optable.tryChangeOpTable(Answer)
				// Answer.walk(1,CK.RULE,this.graph);
			}
			// postParse(Answer)

		}
		return clauses
	}
	/**link the tokens except the end token */
	ArrayToLinkedList(tokens: token[]) {
		const head:{firstToken:token,lastToken:token} ={
			firstToken : tokens[0],
			lastToken :tokens[tokens.length - 1]
		}
		let p = head.firstToken
		for (let index = 1; index < tokens.length-1; index++) {
			const element = tokens[index]
			p.next = element
			p = p.next
		}
		const lastToken = tokens[tokens.length-1];
		if(lastToken.kind != Kind.end && p!=lastToken){
			p.next = lastToken;
		}

		return head
	}

	readClause(tokens: token[]) {
		// const tokens = read_tokens(InputStream(text));
		// if (tokens === undefined)
		// 	return undefined;
		const tokenList = this.ArrayToLinkedList(tokens)
		const [flag1, Term, LeftOver] = this.read(tokenList.firstToken, 1200, 0)
		const flag2 = (tokenList.lastToken?.text == ".")
		// clause 即没有 term 也没有 end 返回undefined
		if ((flag1 || flag2) == false)
			return undefined

		// 检查 clause 的 tokens 读完了没有 。 没有读完的话发送错误提示。
		const flag3 = this.all_read(LeftOver)
		if (flag3 == false)
			// pusherror
			undefined
		return new ClauseNode(Term, tokenList.lastToken)
	}
	// %   all_read(+Tokens)
	// %   checks that there are no unparsed tokens left over.
	all_read(token: token | undefined): boolean {
		if (token === undefined)
			return true
		// if (token.kind == Kind.end)
		// 	return true
		pushError(token.range, 'operator expected after expression')
		return false
	}

	// %   expect(Token, TokensIn, TokensOut)
	// %   reads the next token, checking that it is the one expected, and
	// %   giving an error message if it is not.  It is used to look for
	// %   right brackets of various sorts, as they're all we can be sure of.

	expect(tokenlist: token, Wantedtoken: Partial<token>): [false] | [true, token?] {
		const tkNode = tokenlist
		if (tkNode === undefined) return [false]
		if (Wantedtoken.layout) {
			if (Wantedtoken.layout != tkNode.layout) {
				pushError(tkNode.range, `${tkNode.text} or operator expected`)
				return [false]
			}
		}
		if (Wantedtoken.text) {
			if (Wantedtoken.text != tkNode.text) {
				pushError(tkNode.range, `${tkNode.text} or operator expected`)
				return [false]
			}
		}
		if (Wantedtoken.kind) {
			if (Wantedtoken.kind != tkNode.kind) {
				pushError(tkNode.range, `${tkNode.text} or operator expected`)
				return [false]
			}
		}
		return [true, tkNode.next]

	}


	prefixop(op: string): [false] | [true, number, number] {
		let Prec: number
		Prec = this.optable.current_op(op, "fy")
		if (Prec > 0) {
			return [true, Prec, Prec]
		}
		Prec = this.optable.current_op(op, "fx")
		if (Prec > 0) {
			return [true, Prec, Prec - 1]
		}
		return [false]
	}

	postfixop(op: string): [false] | [true, number, number] {
		let Prec: number
		Prec = this.optable.current_op(op, "yf")
		if (Prec > 0) {
			return [true, Prec, Prec]
		}
		Prec = this.optable.current_op(op, "xf")
		if (Prec > 0) {
			return [true, Prec - 1, Prec]
		}
		return [false]
	}

	infixop(op: string): [false] | [true, number, number, number] {
		let Prec: number
		Prec = this.optable.current_op(op, "xfx")
		if (Prec > 0) {
			return [true, Prec - 1, Prec, Prec - 1]
		}
		Prec = this.optable.current_op(op, "xfy")
		if (Prec > 0) {
			return [true, Prec - 1, Prec, Prec]
		}
		Prec = this.optable.current_op(op, "yfx")
		if (Prec > 0) {
			return [true, Prec, Prec, Prec - 1]
		}
		return [false]
	}

	ambigop(op: string): [boolean, number?, number?, number?, number?, number?] {
		const [flag1, L2, O2] = this.postfixop(op)
		if (flag1 == false)
			return [false]
		const [flag2, L1, O1, R1] = this.infixop(op)
		if (flag2 == false)
			return [false]
		return [true, L1, O1, R1, L2, O2]
	}
	// interface WantedToken
	// {
	// 	layout?: string
	// 	token?: string
	// 	type?: tokenType

	// }
	// function getToken(tokenlist: token, Wantedtoken: WantedToken): [false] | [true, any, token?]
	// {
	// 	const tkNode = tokenlist
	// 	if (tkNode === undefined)
	// 		return [false]
	// 	if (Wantedtoken.layout !== undefined)
	// 	{
	// 		if (Wantedtoken.layout != tkNode.layout)
	// 			return [false]
	// 	}
	// 	if (Wantedtoken.token !== undefined)
	// 	{
	// 		if (Wantedtoken.token != tkNode.text)
	// 			return [false]
	// 	}
	// 	if (Wantedtoken.type !== undefined)
	// 	{
	// 		if (Wantedtoken.type != tkNode.kind)
	// 			return [false]
	// 	}
	// 	return [true, tkNode, tkNode.next]

	// }

	read(head: token | undefined, Precedence: number, context_flags: number): [false] | [true, any, token?] {
	if (head === undefined) return [false]
		const tail = head.next
		switch (head.kind) {
			case Kind.variable:
				return this.read_var(head, tail, Precedence, context_flags)
			case Kind.atom:
				return this.read_name(head, tail, Precedence, context_flags)
			case Kind.integer:
				return this.read_integer(head, tail, Precedence, context_flags)
			case Kind.open_list:
				return this.read_open_list(head, tail, Precedence, context_flags)
			case Kind.open:
				return this.read_open(head, tail, Precedence, context_flags)
			case Kind.open_curly:
				return this.read_open_curly(head, tail, Precedence, context_flags)
			case Kind.string:
				return this.read_string(head, tail, Precedence, context_flags)
			case Kind.back_quoted_string:
				return this.read_back_quoted_string(head, tail, Precedence, context_flags)
			default:
				pushError(head.range, 'expression expected')
				return [false]
		}
	}

	read_var(head: token, tail: token | undefined, Precedence: number, context_flags: number) {
		return this.exprtl0(tail, new VarNode(head), Precedence, context_flags)
	}
	read_name(head: token, tail: token | undefined, Precedence: number, context_flags: number): [true, any, token?] | [false] {
		if (head.text == "-" && tail?.kind == Kind.integer) {
			return this.exprtl0(tail.next, new NegativeNode({ sign: head, integer: tail }), Precedence, context_flags)
		}
		if (tail?.text == "(" && tail.layout == "") {
			const nodes: Node[] = [];
			/* get f() */
			if((tail?.next?.text == ")")){
				return this.exprtl0(tail.next?.next,new FunctorNode(head,nodes,tail.next),Precedence, context_flags)
			}
			const [flag1, Arg1, S2] = this.read(tail.next, 1200, Flag.COMMA_TERMINATES)
			if (flag1 == false)
				return [false]
			nodes.push(Arg1)
			const [flag2, close] = this.read_args(S2, context_flags,nodes)
			if (flag2 == false)
				return [false]
			return this.exprtl0(close?.next, new FunctorNode(head, nodes,close!), Precedence, context_flags)
		}
		const [flag1, Prec, Right] = this.prefixop(head.text)
		if (flag1 == true) {
			return this.after_prefix_op(head, Prec, Right, tail, Precedence, context_flags)
		}
		return this.exprtl0(tail, new AtomNode(head), Precedence, context_flags)
	}

	read_integer(head: token, tail: token | undefined, Precedence: number, context_flags: number) {
		return this.exprtl0(tail, new IntegerNode(head), Precedence, context_flags)
	}
	read_open_list(head: token, tail: token | undefined, Precedence: number, context_flags: number): [true, any, token?] | [false] {
		// TODO Flag
		if (tail?.text == "]")
			return this.exprtl0(tail.next, new AtomNode(head, tail), Precedence, context_flags)
		const [flag1, Arg1, S2] = this.read(tail, 1200, Flag.COMMA_TERMINATES | Flag.BAR_TERMINATES)
		if (flag1 == false)
			return [false]
		const [flag2,commaOrBarOrCloselist, RestArgs, closelist] = this.read_list(S2, context_flags)
		       
		if (flag2 == false)
			return [false]
			/* get , term ]*/
		if (commaOrBarOrCloselist.text == "]"){
			const closelist = commaOrBarOrCloselist;
			return this.exprtl0( closelist?.next,new ListNode(Arg1,closelist,RestArgs!),Precedence,context_flags)
		}
		if(commaOrBarOrCloselist.text == ","){
			const comma = commaOrBarOrCloselist;
			return this.exprtl0( closelist?.next,new ListNode(Arg1,comma,RestArgs!),Precedence,context_flags)
		}
		const bar = commaOrBarOrCloselist;
		/* get | term ]*/
		return this.exprtl0(closelist?.next, new ListNode(Arg1,bar, RestArgs!), Precedence, context_flags)
	}

	read_open(head: token, tail: token | undefined, Precedence: number, context_flags: number): [true, any, token?] | [false] {
		// BUG ?? context_flags set 0 
		const [flag1, Term, S2] = this.read(tail, 1200, 0)
		if (flag1 == false)
			return [false]
		const [flag2, S3] = this.expect(S2 as token, { text: ")" })
		if (flag2 == false)
			return [false]
		return this.exprtl0(S3, Term, Precedence, context_flags)
	}

	read_open_curly(head: token, tail: token | undefined, Precedence: number, context_flags: number): [true, any, token?] | [false] {
		if (tail?.text == "}")
			return this.exprtl0(tail.next, new AtomNode(head, tail), Precedence, context_flags)
		// BUG ??  context_flags set 0 
		const [flag1, Term, S2] = this.read(tail, 1200, 0)
		if (flag1 == false)
			return [false]
		const [flag2, S3] = this.expect(S2 as token, { text: "}" })
		if (flag2 == false)
			return [false]
		return this.exprtl0(S3, new CurlyNode(head, Term, S2 as token), Precedence, context_flags)
	}

	read_string(head: token, tail: token | undefined, Precedence: number, context_flags: number) {
		return this.exprtl0(tail, new StringNode(head), Precedence, context_flags)
	}
	read_back_quoted_string(head: token, tail: token | undefined, Precedence: number, context_flags: number) {
		return this.exprtl0(tail, new BackQuotedNode(head), Precedence, context_flags)
	}
	
	// %   read_args(+Tokens) -TermList, -LeftOver
	// %   parses {',' expr(999)} ')' and returns a list of terms.
	read_args(head: token | undefined, context_flags: number,nodes:Node[]): [false] | [true,token?] {
		if (head === undefined)
			return [false]
		if (head.text == ",") {
			const [flag1, Term, S2] = this.read(head.next, 1200, Flag.COMMA_TERMINATES)
			if (flag1 == false)
				return [false]
			nodes.push(Term)
			const [flag2, close] = this.read_args(S2 as token, context_flags, nodes)
			if (flag2 == false)
				return [false]
			return [true, close]
		}
		if (head.text == ")") {
			return [true,head]
		}
		pushError(head.range, '`,` or `)` expected in arguments')
		return [false]
	}
	// %   read_list(+Tokens)-TermList, -LeftOver
	// %   parses {',' expr(999)} ['|' expr(999)] ']' and returns a list of terms.

	read_list(head: token | undefined, context_flags: number): [false] | [true, commaToken|barToken, ListNode?, token?] {
		if (head === undefined)
			return [false]
		if (head.text == ",") {
			const [flag, Term, S2] = this.read(head.next, 1200, Flag.COMMA_TERMINATES | Flag.BAR_TERMINATES)
			if (flag == false)
				return [false]
			const [flag2, commaOrBarOrCloselist,Rest, LastCloselist] = this.read_list(S2 as token, context_flags)
			if (flag2 == false)
				return [false]
			/* 得到  , Term ]  */
			if (!Rest){
				const Closelist = commaOrBarOrCloselist       /*TODO emptyList*/
				return [true,head,new ListNode(Term,Closelist,new AtomNode(Closelist)),LastCloselist]
			}
			/**得到 , Term,Rest ]   */
			if(commaOrBarOrCloselist.text == ","){
				const comma = commaOrBarOrCloselist;
				return [true,head, new ListNode(Term,comma,Rest),LastCloselist]
			}
			/**得到 , Term|Rest ]   */
			const commaOrBar = commaOrBarOrCloselist
			return [true, head,new ListNode(Term,commaOrBar, Rest), LastCloselist]
		}
		if (head.text == "|") {
			const [flag, Rest, S2] = this.read(head.next, 1200, Flag.COMMA_TERMINATES | Flag.BAR_TERMINATES)
			if (flag == false)
				return [false]
			const [flag1, S] = this.expect(S2 as token, { text: "]" })
			if (flag1 == false)
				return [false]
			return [true,head, Rest, S2]
		}
		if (head.text == "]") {
			return [true, head,undefined, head]
		}
		pushError(head.range, '`,` `|` or `]` expected in list')
		return [false]
	}

	// after_prefix_op(+Op, +Prec, +ArgPrec, +Rest, +Precedence) : -Ans
	after_prefix_op(Op: token, Oprec: number, Aprec: number, S0: token | undefined, Precedence: number, context_flags: number):
		[false] | [true, any, token?] {
		if (Precedence < Oprec) {
			// BUG
			// pushError(Op.range,`prefix operator "${Op.functor}" in context with precedence ${Precedence}`);
			// return [false];

		}
		{
			const S1 = this.peepop(S0)

			const flag2 = this.prefix_is_atom(S1, Oprec,context_flags)
			if (flag2) {
				const [flag3, Answer, S] = this.exprtl(S1, Oprec, new AtomNode(Op), Precedence, context_flags)
				if (flag3)
					return [true, Answer, S]
			}

		}
		{
			const [flag1, Arg, S2] = this.read(S0, Aprec, context_flags)
			if (!flag1) return [false]
			return this.exprtl(S2, Oprec, new PrefixOpArgNode(Op, Arg), Precedence, context_flags)
		}
	}


	// %   The next clause fixes a bug concerning "mop dop(1,2)" where
	// %   mop is monadic and dop dyadic with higher Prolog priority.

	peepop(head: token | undefined) {
		if (!head) return head
		if (head.kind == Kind.atom && head.next?.text === "(" && head.next?.layout === "")
			return head
		{
			const [flag1, L, P, R] = this.infixop(head.text)
			if (flag1) {
				const newhead = new InfixopToken(head, [L, P, R] as [number, number, number])
				return newhead
			}
		}
		{
			const [flag1, L, P] = this.postfixop(head.text)
			if (flag1) {
				const newhead = new PostfixopToken(head, [L, P] as [number, number])
				return newhead
			}
		}
		return head
	}


	// %   prefix_is_atom(+TokenList, +Precedence)
	// %   is true when the right context TokenList of a prefix operator
	// %   of result precedence Precedence forces it to be treated as an
	// %   atom, e.g. (- = X), p(-), [+], and so on.
	prefix_is_atom(head: token | undefined, P: number,context_falgs:number) {
		if (head === undefined)
			return true;
		switch (head.text) {
			case ")":
				return true
			case "]":
				return true
			case "}":
				return true
			case "|":
				if (context_falgs& Flag.BAR_TERMINATES) {
					return true;
				}
				return 1100 >= P
			case ",":
				if (context_falgs& Flag.COMMA_TERMINATES) {
					return true;
				}
				return 1000 >= P
			default:
				break
		}
		if (head instanceof InfixopToken)
			return head.precs[0] >= P;
		if (head instanceof PostfixopToken)
			return head.precs[0] >= P;
		
		return false
	}

	// %   exprtl0(+Tokens, +Term, +Prec) -Answer, -LeftOver
	// %   is called by read/4 after it has read a primary (the Term).
	// %   It checks for following postfix or infix operators.	
	exprtl0(head: token | undefined, Term: any, Precedence: number, context_flags: number): [false] | [true, any, token?] {
		if (head === undefined)
			return [true, Term, head]
		if (head.kind == Kind.atom) {
			{
				const [flag1, L1, O1, R1, L2, O2] = this.ambigop(head.text)
				if (flag1) {
					{
						const [flag2, Answer, S] = this.exprtl(new InfixopToken(head, [L1, O1, R1] as any), 0, Term, Precedence, context_flags)
						if (flag2)
							return [true, Answer, S]
					}
					{
						const [flag2, Answer, S] = this.exprtl(new PostfixopToken(head, [L2, O2] as any), 0, Term, Precedence, context_flags)
						if (flag2)
							return [true, Answer, S]
					}
					return [false]
				}

			}
			{
				const [flag1, L1, O1, R1] = this.infixop(head.text)
				if (flag1)
					return this.exprtl(new InfixopToken(head, [L1, O1, R1]), 0, Term, Precedence, context_flags)
			}
			{
				const [flag1, L2, O2] = this.postfixop(head.text)
				if (flag1)
					return this.exprtl(new PostfixopToken(head, [L2, O2]), 0, Term, Precedence, context_flags)
			}
		}
		if (head.text == ",") {
			if (context_flags & Flag.COMMA_TERMINATES) {
				return [true, Term, head]
			}
			if (Precedence >= 1000) {
				const [flag1, Next, S2] = this.read(head.next, 1000, context_flags)
				if (flag1)
					return this.exprtl(S2, 1000, new CommaNode(Term,head,Next), Precedence, context_flags)
				return [false]
			}
		}
		if (head.text == "|") {
			if (context_flags & Flag.BAR_TERMINATES) {
				return [true, Term, head]
			}
			if (Precedence >= 1100) {
				const [flag1, Next, S2] = this.read(head.next, 1000, context_flags)
				if (flag1)
					return this.exprtl(S2, 1000, new SemicolonNode(Term, head, Next), Precedence, context_flags)
				return [false]
			}
		}
		{
			const [flag1, Culprit] = this.cant_follow_expr(head, context_flags)
			if (flag1) {
				pushError(head.range, `${Culprit} follows expression`)
				// return [true,Term,head];
				return [false]
			}
		}
		return [true, Term, head]
	}
	cant_follow_expr(head: token, context_flags: number): [boolean, string?] {
		switch (head.kind) {
			case Kind.atom:
				return [true, "atom"]
			case Kind.variable:
				return [true, "variable"]
			case Kind.integer:
				return [true, "integer"]
			case Kind.string:
				return [true, "string"]
			case Kind.back_quoted_string:
				return [true, "back quoted string"]
			case Kind.open:
				return [true, "bracket"]
			case Kind.open_list:
				return [true, "bracket"]
			case Kind.open_curly:
				return [true, "bracket"]
			default:
				return [false]
		}
	}

	exprtl(head: token | undefined, C: number, Term: any, Precedence: number, context_flags: number):
		[false] | [true, any, token?] {
		if (head === undefined)
			return [true, Term, head]
		if (head instanceof InfixopToken) {
			const [L, O, R] = head.precs
			// BUG [fixed] example: "[Error => Recover]"  
			// error: " `,` `|` or `]` expected in list "
			if (Precedence >= O && C <= L) {
				const [flag1, Other, S2] = this.read(head.next, R, context_flags)
				if (flag1)
					return this.exprtl(S2, O, new InfixOpArgNode(Term, head, Other), Precedence, context_flags)
				return [false]
			}
		}
		if (head instanceof PostfixopToken) {
			const [L, O] = head.precs
			if (Precedence >= O && C <= L) {
				const S2 = this.peepop(head.next);
				return this.exprtl(S2, O, new PostfixOpArgNode(head, Term), Precedence, context_flags)
			}
		}    
		if (head.text == ",") {
			// read_list or read_args 遇到 , 直接返回
			if (context_flags & Flag.COMMA_TERMINATES) {
				return [true, Term, head]
			}
			if (Precedence >= 1000 && C < 1000) {
				const [flag1, Next, S2] = this.read(head.next, 1000, context_flags)
				if (!flag1)
					return [false]
				return this.exprtl(S2, 1000, new CommaNode(Term, head, Next), Precedence, context_flags)
			}
		}
		if (head.text == "|") {
			// read_list  遇到 , 直接返回
			if (context_flags & Flag.BAR_TERMINATES) {
				return [true, Term, head]
			}
			if (Precedence >= 1100 && C < 1100) {
				const [flag1, Next, S2] = this.read(head.next, 1100, context_flags)
				if (!flag1)
					return [false]
				return this.exprtl(S2, 1100, new SemicolonNode(Term, head,Next), Precedence, context_flags)
			}
		}
		return [true, Term, head]
	}
}





/**
 *  `:-op(Prece,Type,Name).` change the grammar inmmediately!
//  */
// function postParse(Answer: ClauseNode | undefined)
// {
// 	const term = Answer?.term
// 	if (!term)
// 	{
// 		return
// 	}
// 	//
// 	if (term instanceof PrefixOpArgNode && term.functor.text == ":-")
// 	{
// 		const node = term.arg
// 		if (node instanceof FunctorNode && node.functor.text == "op" && node.arity == 3)
// 		{
// 			const prec = Number(node.arg1.functor.text)
// 			const type = (node.restArgs as ListNode).left.functor.text
// 			const name = (node.restArgs as ListNode).right.left.functor.text//Bug here Atom ? token?
// 			op(prec, type, name)
// 		}
// 	}
// }
// debug();
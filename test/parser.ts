/**
 * 这个文件 参考 read.pl (dec-10 prolog)
 */
// import  lexerPeg = require("./lexerPeg");
import fs = require("fs")
import { integer, Range } from 'vscode-languageserver'
import { AtomNode, BackQuotedNode, ClauseNode, CommaNode, FunctorNode, CurlyNode, InfixOpArgNode, InfixopNode, ListNode, NegativeNode, PostfixOpArgNode, PostfixopNode, PrefixOpArgNode, SemicolonNode, StringNode, VarNode, IntegerNode, KeyValueNode } from './astNode'
import { read_tokens, token, InputStream, stream, tokenType } from "./lexer"
import { OpTable } from './op_table'
import { pushError } from './pushDiagnostic'
import { Flag } from "./context_flags"
export { parser ,
	// parseText2
}
type opType = "fy" | "fx" | "xfy" | "xfx" | "yfx" | "yf" | "xf"

function debug()
{
	const fileString = fs.readFileSync("./server/src/test/3.pl").toString()
	const stream = InputStream(fileString)
	for (; ;)
	{
		if (stream.pos >= stream.text.length)
			break
		const tokens = read_tokens(stream)
		if (tokens === undefined)
			break
		const Answer = readClause(tokens)
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
class parser{
	parseText(text: string)
	{
		const clauses: ClauseNode[] = [];
		const optable = new OpTable();
		const stream = InputStream(text)
		{
			const tokens = read_tokens(stream)
			if (tokens === undefined)
				return clauses;
			const Answer = this.readClause(tokens);
			if (Answer !== undefined){
				clauses.push(Answer);
				optable.tryChangeOpTable(Answer);
			}
		}
		for (; ;)
		{
			if (stream.pos >= stream.text.length)
				break;
			const tokens = read_tokens(stream)
			if (tokens === undefined)
				break;
			const Answer = this.readClause(tokens);
			if (Answer !== undefined){
				clauses.push(Answer);
				optable.tryChangeOpTable(Answer);
			}
			// postParse(Answer)

		}
		return clauses
	}
ArrayToLinkedList(tokens: token[])
{
	const head: any = {}
	head.firstToken = tokens[0]
	head.lastToken = tokens[tokens.length - 1]
	let p = head.firstToken
	for (let index = 1; index < tokens.length; index++)
	{
		const element = tokens[index]
		p.next = element
		p = p.next
	}

	return head
}

readClause(tokens: token[])
{
	// const tokens = read_tokens(InputStream(text));
	// if (tokens === undefined)
	// 	return undefined;
	const tokenList = this.ArrayToLinkedList(tokens)
	const [flag1, Term, LeftOver] = this.read(tokenList.firstToken, 1200, 0)
	const flag2 = (tokenList.lastToken?.functor == ".")
	// clause 即没有 term 也没有 end 返回undefined
	if ((flag1 || flag2) == false)
		return undefined

	// 检查 clause 的 tokens 读完了没有 。 没有读完的话发送错误提示。
	const flag3 = this.all_read(LeftOver)
	if (flag3 == false)
		// pusherror
		undefined;
	return new ClauseNode(Term, tokenList.lastToken)
}
// %   all_read(+Tokens)
// %   checks that there are no unparsed tokens left over.
all_read(token: token | undefined): boolean
{
	if (token === undefined)
		return true
	if (token.kind == Kind.end)
		return true
	pushError(token.range, 'operator expected after expression')
	return false
}

// %   expect(Token, TokensIn, TokensOut)
// %   reads the next token, checking that it is the one expected, and
// %   giving an error message if it is not.  It is used to look for
// %   right brackets of various sorts, as they're all we can be sure of.

 expect(tokenlist: token, Wantedtoken: WantedToken): [false] | [true, token?]
{
	const tkNode = tokenlist
	if (tkNode === undefined) return [false]
	if (Wantedtoken.layout)
	{
		if (Wantedtoken.layout != tkNode.layout)
		{
			pushError(tkNode.range, `${tkNode.text} or operator expected`)
			return [false]
		}
	}
	if (Wantedtoken.token)
	{
		if (Wantedtoken.token != tkNode.text)
		{
			pushError(tkNode.range, `${tkNode.text} or operator expected`)
			return [false]
		}
	}
	if (Wantedtoken.type)
	{
		if (Wantedtoken.type != tkNode.kind)
		{
			pushError(tkNode.range, `${tkNode.text} or operator expected`)
			return [false]
		}
	}
	return [true, tkNode.next]

}


 prefixop(op: string): [false] | [true, number, number]
{
	let Prec: integer
	Prec = current_op(op, "fy")
	if (Prec > 0)
	{
		return [true, Prec, Prec]
	}
	Prec = current_op(op, "fx")
	if (Prec > 0)
	{
		return [true, Prec, Prec - 1]
	}
	return [false]
}

 postfixop(op: string): [false] | [true, number, number]
{
	let Prec: integer
	Prec = current_op(op, "yf")
	if (Prec > 0)
	{
		return [true, Prec, Prec]
	}
	Prec = current_op(op, "xf")
	if (Prec > 0)
	{
		return [true, Prec - 1, Prec]
	}
	return [false]
}

 infixop(op: string): [false] | [true, number, number, number]
{
	let Prec: integer
	Prec = current_op(op, "xfx")
	if (Prec > 0)
	{
		return [true, Prec - 1, Prec, Prec - 1]
	}
	Prec = current_op(op, "xfy")
	if (Prec > 0)
	{
		return [true, Prec - 1, Prec, Prec]
	}
	Prec = current_op(op, "yfx")
	if (Prec > 0)
	{
		return [true, Prec, Prec, Prec - 1]
	}
	return [false]
}

 ambigop(op: string): [boolean, number?, number?, number?, number?, number?]
{
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

 read(head: token | undefined, Precedence: number, context_flags: number): [false] | [true, any, token?]
{
	if (head == undefined) return [false]
	const tail = head.next
	switch (head.kind)
	{
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

 read_var(head: token, tail: token | undefined, Precedence: number, context_flags: number)
{
	return this.exprtl0(tail, new VarNode(head), Precedence, context_flags)
}
 read_name(head: token, tail: token | undefined, Precedence: number, context_flags: number): [true, any, token?] | [false]
{
	if (head.text == "-" && tail?.kind == Kind.integer)
	{
		return this.exprtl0(tail.next, new NegativeNode({ sign: head, integer: tail }), Precedence, context_flags)
	}
	if (tail?.text == "(" && tail.layout == "")
	{
		const [flag1, Arg1, S2] = this.read(tail.next, 999, Flag.COMMA_TERMINATES)
		if (flag1 == false)
			return [false]
		const [flag2, RestArgs, S3] = this.read_args(S2, context_flags)
		if (flag2 == false)
			return [false]
		return this.exprtl0(S3, new FunctorNode(head, Arg1, RestArgs), Precedence, context_flags)
	}
	const [flag1, Prec, Right] = this.prefixop(head.text)
	if (flag1 == true)
	{
		return this.after_prefix_op(head, Prec, Right, tail, Precedence, context_flags)
	}
	return this.exprtl0(tail, new AtomNode(head), Precedence, context_flags)
}

 read_integer(head: token, tail: token | undefined, Precedence: number, context_flags: number)
{
	return this.exprtl0(tail, new IntegerNode(head), Precedence, context_flags)
}
 read_open_list(head: token, tail: token | undefined, Precedence: number, context_flags: number): [true, any, token?] | [false]
{
	// TODO Flag
	if (tail?.text == "]")
		return this.exprtl0(tail.next, new AtomNode(head, tail), Precedence, context_flags)
	const [flag1, Arg1, S2] = this.read(tail, 999, Flag.COMMA_TERMINATES | Flag.BAR_TERMINATES)
	if (flag1 == false)
		return [false]
	const [flag2, RestArgs, S3] = this.read_list(S2, context_flags)
	if (flag2 == false)
		return [false]
	return this.exprtl0(S3, new ListNode(Arg1, RestArgs), Precedence, context_flags)
}

 read_open(head: token, tail: token | undefined, Precedence: number, context_flags: number): [true, any, token?] | [false]
{
	// BUG ?? context_flags set 0 
	const [flag1, Term, S2] = this.read(tail, 1200, 0)
	if (flag1 == false)
		return [false]
	const [flag2, S3] = this.expect(S2 as token, { token: ")" })
	if (flag2 == false)
		return [false]
	return this.exprtl0(S3, Term, Precedence, context_flags)
}

 read_open_curly(head: token, tail: token | undefined, Precedence: number, context_flags: number): [true, any, token?] | [false]
{
	if (tail?.text == "}")
		return this.exprtl0(tail.next, new AtomNode(head, tail), Precedence, context_flags)
	// BUG ??  context_flags set 0 
	const [flag1, Term, S2] = this.read(tail, 1200, 0)
	if (flag1 == false)
		return [false]
	const [flag2, S3] = this.expect(S2 as token, { token: "}" })
	if (flag2 == false)
		return [false]
	return this.exprtl0(S3, new CurlyNode(head, Term, S2 as token), Precedence, context_flags)
}

 read_string(head: token, tail: token | undefined, Precedence: number, context_flags: number)
{
	return this.exprtl0(tail, new StringNode(head), Precedence, context_flags)
}
 read_back_quoted_string(head: token, tail: token | undefined, Precedence: number, context_flags: number)
{
	return this.exprtl0(tail, new BackQuotedNode(head), Precedence, context_flags)
}

// %   read_args(+Tokens) -TermList, -LeftOver
// %   parses {',' expr(999)} ')' and returns a list of terms.
 read_args(head: token | undefined, context_flags: number): [false] | [true, any, token?]
{
	if (head === undefined)
		return [false]
	if (head.text == ",")
	{
		const [flag1, Term, S2] = this.read(head.next, 999, Flag.COMMA_TERMINATES)
		if (flag1 == false)
			return [false]
		const [flag2, Rest, S] = this.read_args(S2 as token, context_flags)
		if (flag2 == false)
			return [false]
		return [true, new ListNode(Term, Rest), S]
	}
	if (head.text == ")")
	{
		return [true, new AtomNode(head), head.next]
	}
	pushError(head.range, '`,` or `)` expected in arguments')
	return [false]
}
// %   read_list(+Tokens)-TermList, -LeftOver
// %   parses {',' expr(999)} ['|' expr(999)] ']' and returns a list of terms.

 read_list(head: token | undefined, context_flags: number): [false] | [true, any, token?]
{
	if (head === undefined)
		return [false]
	if (head.text == ",")
	{
		const [flag, Term, S2] = this.read(head.next, 999, Flag.COMMA_TERMINATES | Flag.BAR_TERMINATES)
		if (flag == false)
			return [false]
		const [flag2, Rest, S] = this.read_list(S2 as token, context_flags)
		if (flag2 == false)
			return [false]
		return [true, new ListNode(Term, Rest), S]
	}
	if (head.text == "|")
	{
		const [flag, Rest, S2] = this.read(head.next, 999, Flag.COMMA_TERMINATES | Flag.BAR_TERMINATES)
		if (flag == false)
			return [false]
		const [flag1, S] = this.expect(S2 as token, { token: "]" })
		if (flag1 == false)
			return [false]
		return [true, Rest, S]
	}
	if (head.text == "]")
	{
		return [true, new AtomNode(head), head.next]
	}
	pushError(head.range, '`,` `|` or `]` expected in list')
	return [false]
}

// after_prefix_op(+Op, +Prec, +ArgPrec, +Rest, +Precedence) : -Ans
 after_prefix_op(Op: token, Oprec: number, Aprec: number, S0: token | undefined, Precedence: number, context_flags: number):
	[false] | [true, any, token?]
{
	if (Precedence < Oprec)
	{
		// BUG
		// pushError(Op.range,`prefix operator "${Op.functor}" in context with precedence ${Precedence}`);
		// return [false];

	}
	{
		const S1 = this.peepop(S0)

		const flag2 = this.prefix_is_atom(S1, Oprec)
		if (flag2)
		{
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

 peepop(head: token | undefined)
{
	if (!head) return head
	if (head.kind == Kind.atom && head.next?.text === "(" && head.next?.layout === "")
		return head
	{
		const [flag1, L, P, R] = this.infixop(head.text)
		if (flag1)
		{
			const newhead = new InfixopNode(head, [L, P, R] as [number, number, number])
			return newhead
		}
	}
	{
		const [flag1, L, P] = this.postfixop(head.text)
		if (flag1)
		{
			const newhead = new PostfixopNode(head, [L, P] as [number, number])
			return newhead
		}
	}
	return head
}


// %   prefix_is_atom(+TokenList, +Precedence)
// %   is true when the right context TokenList of a prefix operator
// %   of result precedence Precedence forces it to be treated as an
// %   atom, e.g. (- = X), p(-), [+], and so on.
 prefix_is_atom(head: token | undefined, P: number)
{
	if (head === undefined)
		return true
	if (head instanceof InfixopNode)
		return head.precs[0] >= P
	if (head instanceof PostfixopNode)
		return head.precs[0] >= P
	switch (head.text)
	{
		case ")":
			return true
		case "]":
			return true
		case "}":
			return true
		case "|":
			return 1100 >= P
		case ",":
			return 1000 >= P
		default:
			break
	}
	return false
}

// %   exprtl0(+Tokens, +Term, +Prec) -Answer, -LeftOver
// %   is called by read/4 after it has read a primary (the Term).
// %   It checks for following postfix or infix operators.	
 exprtl0(head: token | undefined, Term: any, Precedence: number, context_flags: number): [false] | [true, any, token?]
{
	if (head === undefined)
		return [true, Term, head]
	if (head.kind == Kind.atom)
	{
		{
			const [flag1, L1, O1, R1, L2, O2] = this.ambigop(head.text)
			if (flag1)
			{
				{
					const [flag2, Answer, S] = this.exprtl(new InfixopNode(head, [L1, O1, R1] as any), 0, Term, Precedence, context_flags)
					if (flag2)
						return [true, Answer, S]
				}
				{
					const [flag2, Answer, S] = this.exprtl(new PostfixopNode(head, [L2, O2] as any), 0, Term, Precedence, context_flags)
					if (flag2)
						return [true, Answer, S]
				}
				return [false]
			}

		}
		{
			const [flag1, L1, O1, R1] = this.infixop(head.text)
			if (flag1)
				return this.exprtl(new InfixopNode(head, [L1, O1, R1]), 0, Term, Precedence, context_flags)
		}
		{
			const [flag1, L2, O2] = this.postfixop(head.text)
			if (flag1)
				return this.exprtl(new PostfixopNode(head, [L2, O2]), 0, Term, Precedence, context_flags)
		}
	}
	if (head.text == ",")
	{
		if (context_flags & Flag.COMMA_TERMINATES)
		{
			return [true, Term, head]
		}
		if (Precedence >= 1000)
		{
			const [flag1, Next, S2] = this.read(head.next, 1000, context_flags)
			if (flag1)
				return this.exprtl(S2, 1000, new CommaNode(Term, Next), Precedence, context_flags)
			return [false]
		}
	}
	if (head.text == "|")
	{
		if (context_flags & Flag.BAR_TERMINATES)
		{
			return [true, Term, head]
		}
		if (Precedence >= 1100)
		{
			const [flag1, Next, S2] = this.read(head.next, 1000, context_flags)
			if (flag1)
				return this.exprtl(S2, 1000, new SemicolonNode(Term, Next), Precedence, context_flags)
			return [false]
		}
	}
	{
		const [flag1, Culprit] = this.cant_follow_expr(head, context_flags)
		if (flag1)
		{
			pushError(head.range, `${Culprit} follows expression`)
			// return [true,Term,head];
			return [false]
		}
	}
	return [true, Term, head]
}
 cant_follow_expr(head: token, context_flags: number): [boolean, string?]
{
	switch (head.kind)
	{
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
	[false] | [true, any, token?]
{
	if (head === undefined)
		return [true, Term, head]
	if (head instanceof InfixopNode)
	{
		const [L, O, R] = head.precs
		// BUG [fixed] example: "[Error => Recover]"  
		// error: " `,` `|` or `]` expected in list "
		if (/*Precedence >= O &&*/ C <= L)
		{
			const [flag1, Other, S2] = this.read(head.next, R, context_flags)
			if (flag1)
				return this.exprtl(S2, O, new InfixOpArgNode(Term, head, Other), Precedence, context_flags)
			return [false]
		}
	}
	if (head instanceof PostfixopNode)
	{
		const [L, O] = head.precs
		if (Precedence >= O && C <= L)
		{
			const S2 = this.peepop(head)
			return this.exprtl(S2, O, new PostfixOpArgNode(head, Term), Precedence, context_flags)
		}
	}
	if (head.text == ",")
	{
		// read_list or read_args 遇到 , 直接返回
		if (context_flags & Flag.COMMA_TERMINATES)
		{
			return [true, Term, head]
		}
		if (Precedence >= 1000 && C < 1000)
		{
			const [flag1, Next, S2] = this.read(head.next, 1000, context_flags)
			if (!flag1)
				return [false]
			return this.exprtl(S2, 1000, new CommaNode(Term, Next), Precedence, context_flags)
		}
	}
	if (head.text == "|")
	{
		// read_list  遇到 , 直接返回
		if (context_flags & Flag.BAR_TERMINATES)
		{
			return [true, Term, head]
		}
		if (Precedence >= 1100 && C < 1100)
		{
			const [flag1, Next, S2] = this.read(head.next, 1100, context_flags)
			if (!flag1)
				return [false]
			return this.exprtl(S2, 1100, new SemicolonNode(Term, Next), Precedence, context_flags)
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
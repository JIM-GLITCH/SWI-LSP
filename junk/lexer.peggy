/*run "peggy lexer.peggy"*/
{{
	function debug(){
	console.time("debug");
	const fileString = fs.readFileSync("./server/src/test/t.pl").toString();
	tokens = peg$parse("fileString")
		console.log(tokens);
		console.timeEnd("debug");
	}
	
}}
{
const kind = {
	atom:1,
	variable:2,
	float:3,
	integer:4,
	string:5,
	back_quoted_string:6,
	open:7,
	close:8,
	open_list:9,
	close_list:10,
	open_curly:11,
	close_curly:12,
	ht_sep:13,
	comma:14,
	end:15,
}
function buildToken(kind) {
	return{
		text:text(),
		range:getRange(),
		kind : kind
	}
	
}


	function getRange() {
		let loc = location();
		let startline = loc.start.line-1
		let startcharacter = loc.start.column-1
		let endline = loc.end.line-1
		let endcharacter = loc.end.column-1
		return {
					start: { 
						line:startline,
						character:startcharacter
					},
					end:{
						line:endline,
						character:endcharacter	
					}
			} 
	}
}
TokenList = 
	tokens:OneToken*
	layout_text
	{
	return tokens
}
OneToken =
	layout:layout_text 
	token:(
	atom
	/variable
	/float
	/integer
	/double_quoted_list // TODO \uXXXX \UXXXXXXXX 
	/back_quoted_string // TODO \uXXXX \UXXXXXXXX
	/open
	/close
	/open_list
	/close_list
	/open_curly
	/close_curly
	/ht_sep
	/comma
	/end)
	{	
		token.layout = layout;
		token.fullRange=getRange();
		return token;
	}
atom =atom_token{return       (kind.atom)};
end = end_token{return buildToken(kind.end)};
variable  = variable_token{return buildToken(kind.variable)};
integer = integer_token{return buildToken(kind.integer)};
float = float_token{return buildToken(kind.float)};
double_quoted_list = double_quoted_list_token{return buildToken(kind.string)};
open = open_token{return buildToken(kind.open)};
close  = close_token{return buildToken(kind.close)};
open_list = open_list_token{return buildToken(kind.open_list)};
close_list = close_list_token{return buildToken(kind.close_list)};
open_curly = open_curly_token{return buildToken(kind.open_curly)};
close_curly  = close_curly_token{return buildToken(kind.close_curly)};
ht_sep  = ht_sep_token{return buildToken(kind.ht_sep)};
comma = comma_token{return buildToken(kind.comma)};
back_quoted_string  = back_quoted_string_token{return buildToken(kind.back_quoted_string)};

layout_text=(
	(layout_char / comment)*
){
	return text(); 
}


comment = single_line_comment /bracketed_comment
single_line_comment = "%" (!"\n" .)* "\n"
bracketed_comment = "/*" (!"*/" .)* "*/"

semicolon_token = semicolon_char
atom_token =
		letter_digit_token 
		/graphic_token
		/quoted_token
		/semicolon_token
		/cut_token

letter_digit_token=[a-z] alphanumeric_char*;

graphic_token= !end_token graphic_token_char+
end_token= "." & ( layout_char/ "%" / EOF)
EOF = !.
graphic_token_char=graphic_char / backslash_char
graphic_char = [#$&*+\-./:<=>?@^~]
backslash_char="\\"



meta_char=
	backslash_char
	/single_quote_char
	/double_quote_char
	/back_quote_char
single_quote_char= "'"
double_quote_char = '"'
back_quote_char = "`"
solo_char = 
	cut_char/
	open_char/
	close_char/
	comma_char/
	semicolon_char/
	open_list_char/
	close_list_char/
	open_curly_char/
	close_curly_char/
	head_tail_separator_char/
	end_line_comment_char;

control_escape_sequence = 
	backslash_char
	symbolic_control_char
quoted_token = 
	single_quote_char
	single_quoted_item*
	single_quote_char
single_quoted_item=
	single_quoted_character
	/continuation_escape_sequence
	
continuation_escape_sequence=
	backslash_char
	new_line_char

cut_token = "!"

// BUG here cant match '\n'
non_quote_char = 
	meta_escape_sequence
	/control_escape_sequence
	/octal_escape_sequence
	/hexcadecimal_escape_sequence
	/graphic_char
	/alphanumeric_char
	/solo_char
	/space_char
	// BUG here? so add new_line_char
	/new_line_char

single_quoted_character =
	non_quote_char
	/(single_quote_char single_quote_char)
	/double_quote_char
	/back_quote_char
double_quoted_character=
	(double_quote_char double_quote_char)
	/single_quote_char
	/non_quote_char
	/back_quote_char
back_quoted_character=
	(back_quote_char back_quote_char)
	/single_quote_char
	/non_quote_char
	/double_quote_char
meta_escape_sequence=
	backslash_char meta_char

symbolic_control_char=
	symbolic_alert_char
	/symbolic_backspace_char
	/symbolic_carriage_return_char
	/symbolic_form_feed_char
	/symbolic_horizontal_tab_char
	/symbolic_new_line_char
	/symbolic_vertical_tab_char
	/"e"
	/"s"
	/"c"
symbolic_alert_char="a"
symbolic_backspace_char="b"
symbolic_carriage_return_char="r"
symbolic_form_feed_char="f"
symbolic_horizontal_tab_char="t"
symbolic_new_line_char="n"
symbolic_vertical_tab_char="v"
octal_escape_sequence=
	backslash_char octal_digit_char+
	backslash_char?
hexcadecimal_escape_sequence=
	backslash_char
	symbolic_hexadecimal_char
	hexadecimal_digit_char+
	backslash_char
symbolic_hexadecimal_char = "x"
variable_token= 
	named_variable 
	/anonymous_variable
anonymous_variable = "_"
named_variable = 
(variable_indicator_char alphanumeric_char+)
/(capital_letter_char alphanumeric_char*)
variable_indicator_char = "_"
integer_token = 
	character_code_constant
	/binary_constant
	/octal_constant
	/hexadecimal_constant
	/integer_constant
integer_constant = 
	decimal_digit_char 
	( "_"? " "* decimal_digit_char)*
decimal_digit_char=[0-9]
character_code_constant=
	"0'" (single_quoted_character/single_quote_char)
binary_constant =
	binary_constant_indicator
	binary_digit_char+
binary_digit_char = [01]
binary_constant_indicator = "0b"
octal_constant = 
	octal_constant_indicator
	octal_digit_char+
octal_digit_char=[0-7]
octal_constant_indicator="0o"
hexadecimal_constant = 
	hexadecimal_constant_indicator
	hexadecimal_digit_char+
hexadecimal_constant_indicator = "0x"
hexadecimal_digit_char= [0-9a-fA-F]
underscore_char = "_"
decimal_point_char = "."
fraction = decimal_point_char decimal_digit_char+
sign = [+-]
exponent_char=[eE]
exponent = exponent_char sign? integer_constant
float_token = integer_constant fraction exponent?

double_quoted_item=
	double_quoted_character 
	/continuation_escape_sequence
double_quoted_list_token= 
	double_quote_char 
	double_quoted_item* 
	double_quote_char

back_quoted_item=
	back_quoted_character
	/continuation_escape_sequence
open_token = open_char
close_token =close_char
open_list_token =open_list_char
close_list_token=close_list_char
open_curly_token = open_curly_char
close_curly_token = close_curly_char
ht_sep_token = head_tail_separator_char
comma_token = comma_char

cut_char = "!"
open_char = "("
close_char = ")"
comma_char = ","
semicolon_char = ";"
open_list_char = "["
close_list_char = "]"
open_curly_char = "{"
close_curly_char="}"
head_tail_separator_char = "|"
end_line_comment_char = "%"

layout_char=
	space_char
	/horizontal_tab_char
	/new_line_char
space_char = " "
horizontal_tab_char="\t"
new_line_char = "\r\n"/"\n"/"\r"
small_letter_char=[a-z]
alphanumeric_char = alpha_char/decimal_digit_char
alpha_char=underscore_char/letter_char
letter_char = capital_letter_char/small_letter_char
capital_letter_char = [A-Z]
back_quoted_string_token =
	back_quote_char 
	back_quoted_item*
	back_quote_char 
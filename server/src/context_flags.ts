/*
 *  this file is copied from eclipse read.c
 */
export {Flag};

/**
 *
 * Values for context_flags.
 * The *_TERMINATES flags mean that COMMA/BAR terminate a term
 * unconditionally, i.e. overriding the normal precedence rules
 * (this is used when a subterm is a list or structure argument).
 * The SUBSCRIPTABLE flag means the term may be followed by a subscript.
 */
const enum Flag{
	COMMA_TERMINATES= 0x01,		/* list elements or structure fields */
	BAR_TERMINATES= 0x02,		/* list elements only */
	SUBSCRIPTABLE= 0x04,		/* term can be followed by subscript */
	PREBINFIRST= 0x08,			/* first argument of prefix binary op */
	FZINC_SUBSCRIPTABLE= 0x10,	/* subscripts after atoms */
	ZINC_SUBSCRIPTABLE= 0x20,	/* subscripts after almost everything */
	ATTRIBUTABLE= 0x40,			/* term can be followed by attributes */
	ARGOFOP= 0x80,				/* argument of an operator */
	OPCANTFOLLOW= 0x100,		/* (infix/postfix) operator can't follow (iso) */
	COLON_TERMINATES=0x200
}
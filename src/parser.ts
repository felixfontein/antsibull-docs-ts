/*
  Simplified BSD License (see LICENSES/BSD-2-Clause.txt or https://opensource.org/licenses/BSD-2-Clause)
  SPDX-FileCopyrightText: Ansible Project
  SPDX-License-Identifier: BSD-2-Clause
*/

import { ParsingOptions, PluginIdentifier } from './opts';
import { isFQCN, isPluginType } from './ansible';

export enum PartType {
  ERROR = 0,
  BOLD = 1,
  CODE = 2,
  HORIZONTAL_LINE = 3,
  ITALIC = 4,
  LINK = 5,
  MODULE = 6,
  RST_REF = 7,
  URL = 8,
  TEXT = 9,
  ENV_VARIABLE = 10,
  OPTION_NAME = 11,
  OPTION_VALUE = 12,
  PLUGIN = 13,
  RETURN_VALUE = 14,
}

export interface Part {
  type: PartType;
}

export interface TextPart extends Part {
  type: PartType.TEXT;
  text: string;
}

export interface ItalicPart extends Part {
  type: PartType.ITALIC;
  text: string;
}

export interface BoldPart extends Part {
  type: PartType.BOLD;
  text: string;
}

export interface ModulePart extends Part {
  type: PartType.MODULE;
  fqcn: string;
}

export interface PluginPart extends Part {
  type: PartType.PLUGIN;
  plugin: PluginIdentifier;
}

export interface URLPart extends Part {
  type: PartType.URL;
  url: string;
}

export interface LinkPart extends Part {
  type: PartType.LINK;
  text: string;
  url: string;
}

export interface RSTRefPart extends Part {
  type: PartType.RST_REF;
  text: string;
  ref: string;
}

export interface CodePart extends Part {
  type: PartType.CODE;
  text: string;
}

export interface OptionNamePart extends Part {
  type: PartType.OPTION_NAME;
  plugin: PluginIdentifier | undefined;
  link: string[];
  name: string;
  value: string | undefined;
}

export interface OptionValuePart extends Part {
  type: PartType.OPTION_VALUE;
  value: string;
}

export interface EnvVariablePart extends Part {
  type: PartType.ENV_VARIABLE;
  name: string;
}

export interface ReturnValuePart extends Part {
  type: PartType.RETURN_VALUE;
  plugin: PluginIdentifier | undefined;
  link: string[];
  name: string;
  value: string | undefined;
}

export interface HorizontalLinePart extends Part {
  type: PartType.HORIZONTAL_LINE;
}

export interface ErrorPart extends Part {
  type: PartType.ERROR;
  message: string;
}

export type AnyPart =
  | TextPart
  | ItalicPart
  | BoldPart
  | ModulePart
  | PluginPart
  | URLPart
  | LinkPart
  | RSTRefPart
  | CodePart
  | OptionNamePart
  | OptionValuePart
  | EnvVariablePart
  | ReturnValuePart
  | HorizontalLinePart
  | ErrorPart;

export type Paragraph = AnyPart[];

const IGNORE_MARKER = 'ignore:';

function parseOptionLike(
  text: string,
  opts: ParsingOptions,
  type: PartType.OPTION_NAME | PartType.RETURN_VALUE,
): OptionNamePart | ReturnValuePart {
  let value: string | undefined;
  const eq = text.indexOf('=');
  if (eq >= 0) {
    value = text.substring(eq + 1, text.length);
    text = text.substring(0, eq);
  }
  const m = /^([^.]+\.[^.]+\.[^#]+)#([a-z]+):(.*)$/.exec(text);
  let plugin: PluginIdentifier | undefined;
  if (m) {
    const pluginFqcn = m[1] as string;
    const pluginType = m[2] as string;
    if (!isFQCN(pluginFqcn)) {
      throw Error(`Plugin name "${pluginFqcn}" is not a FQCN`);
    }
    if (!isPluginType(pluginType)) {
      throw Error(`Plugin type "${pluginType}" is not valid`);
    }
    plugin = { fqcn: pluginFqcn, type: pluginType };
    text = m[3] as string;
  } else if (text.startsWith(IGNORE_MARKER)) {
    plugin = undefined;
    text = text.substring(IGNORE_MARKER.length, text.length);
  } else {
    plugin = opts.current_plugin;
  }
  if (/[:#]/.test(text)) {
    throw Error(`Invalid option/return value name "${text}"`);
  }
  return {
    type: type,
    plugin: plugin,
    link: text.replace(/\[([^\]]*)\]/g, '').split('.'),
    name: text,
    value: value,
  };
}

interface CommandParser {
  command: string;
  parameters: number;
  old_markup?: boolean;
  escaped_arguments?: boolean;
  process: (args: string[], opts: ParsingOptions) => AnyPart;
}

const PARSER: CommandParser[] = [
  // Classic Ansible docs markup:
  {
    command: 'I',
    parameters: 1,
    old_markup: true,
    process: (args) => {
      const text = args[0] as string;
      return <ItalicPart>{ type: PartType.ITALIC, text: text };
    },
  },
  {
    command: 'B',
    parameters: 1,
    old_markup: true,
    process: (args) => {
      const text = args[0] as string;
      return <BoldPart>{ type: PartType.BOLD, text: text };
    },
  },
  {
    command: 'M',
    parameters: 1,
    old_markup: true,
    process: (args) => {
      const fqcn = args[0] as string;
      if (!isFQCN(fqcn)) {
        throw Error(`Module name "${fqcn}" is not a FQCN`);
      }
      return <ModulePart>{ type: PartType.MODULE, fqcn: fqcn };
    },
  },
  {
    command: 'U',
    parameters: 1,
    old_markup: true,
    process: (args) => {
      const url = args[0] as string;
      return <URLPart>{ type: PartType.URL, url: url };
    },
  },
  {
    command: 'L',
    parameters: 2,
    old_markup: true,
    process: (args) => {
      const text = args[0] as string;
      const url = args[1] as string;
      return <LinkPart>{ type: PartType.LINK, text: text, url: url };
    },
  },
  {
    command: 'R',
    parameters: 2,
    old_markup: true,
    process: (args) => {
      const text = args[0] as string;
      const ref = args[1] as string;
      return <RSTRefPart>{ type: PartType.RST_REF, text: text, ref: ref };
    },
  },
  {
    command: 'C',
    parameters: 1,
    old_markup: true,
    process: (args) => {
      const text = args[0] as string;
      return <CodePart>{ type: PartType.CODE, text: text };
    },
  },
  {
    command: 'HORIZONTALLINE',
    parameters: 0,
    old_markup: true,
    process: () => {
      return <HorizontalLinePart>{ type: PartType.HORIZONTAL_LINE };
    },
  },
  // Semantic Ansible docs markup:
  {
    command: 'P',
    parameters: 1,
    escaped_arguments: true,
    process: (args) => {
      const m = /^([^).]+\.[^).]+\.[^)]+)#([a-z]+)$/.exec(args[0] as string);
      if (!m) {
        throw Error(`Parameter "${args[0]}" is not of the form FQCN#type`);
      }
      const fqcn = m[1] as string;
      if (!isFQCN(fqcn)) {
        throw Error(`Plugin name "${fqcn}" is not a FQCN`);
      }
      const type = m[2] as string;
      if (!isPluginType(type)) {
        throw Error(`Plugin type "${type}" is not valid`);
      }
      return <PluginPart>{ type: PartType.PLUGIN, plugin: { fqcn: fqcn, type: type } };
    },
  },
  {
    command: 'E',
    parameters: 1,
    escaped_arguments: true,
    process: (args) => {
      const env = args[0] as string;
      return <EnvVariablePart>{ type: PartType.ENV_VARIABLE, name: env };
    },
  },
  {
    command: 'V',
    parameters: 1,
    escaped_arguments: true,
    process: (args) => {
      const value = args[0] as string;
      return <OptionValuePart>{ type: PartType.OPTION_VALUE, value: value };
    },
  },
  {
    command: 'O',
    parameters: 1,
    escaped_arguments: true,
    process: (args, opts) => {
      const value = args[0] as string;
      return parseOptionLike(value, opts, PartType.OPTION_NAME);
    },
  },
  {
    command: 'RV',
    parameters: 1,
    escaped_arguments: true,
    process: (args, opts) => {
      const value = args[0] as string;
      return parseOptionLike(value, opts, PartType.RETURN_VALUE);
    },
  },
];

const PARSER_COMMANDS: Map<string, CommandParser> = (() => {
  const result = new Map<string, CommandParser>();
  PARSER.forEach((cmd) => result.set(cmd.command, cmd));
  return result;
})();

function commandRE(command: CommandParser): string {
  return '\\b' + command.command + (command.parameters === 0 ? '\\b' : '\\(');
}

const COMMAND_RE = new RegExp('(' + PARSER.map(commandRE).join('|') + ')', 'g');
const CLASSIC_COMMAND_RE = new RegExp(
  '(' +
    PARSER.filter((cmd) => cmd.old_markup)
      .map(commandRE)
      .join('|') +
    ')',
  'g',
);

function lstripSpace(input: string): string {
  let index = 0;
  const length = input.length;
  while (index < length && input[index] === ' ') {
    index += 1;
  }
  return index > 0 ? input.slice(index) : input;
}

function rstripSpace(input: string) {
  const length = input.length;
  let index = length;
  while (index > 0 && input[index - 1] === ' ') {
    index -= 1;
  }
  return index < length ? input.slice(0, index) : input;
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
function parseEscapedArgs(input: string, index: number, count: number): [string[], number, string | undefined] {
  const result: string[] = [];
  let parameter_count = count;
  const escapeOrComma = /\\(.)| *(,) */g;
  while (parameter_count > 1) {
    parameter_count -= 1;
    const value: string[] = [];
    /* eslint-disable-next-line no-constant-condition */
    while (true) {
      escapeOrComma.lastIndex = index;
      const match = escapeOrComma.exec(input);
      if (!match) {
        result.push(value.join(''));
        return [result, index, `Cannot find comma separating parameter ${count - parameter_count} from the next one`];
      }
      if (match.index > index) {
        value.push(input.substring(index, match.index));
      }
      index = match.index + match[0].length;
      if (match[1] === undefined) {
        break;
      }
      value.push(match[1]);
    }
    result.push(value.join(''));
  }
  const escapeOrClosing = /\\(.)|([)])/g;
  const value: string[] = [];
  /* eslint-disable-next-line no-constant-condition */
  while (true) {
    escapeOrClosing.lastIndex = index;
    const match = escapeOrClosing.exec(input);
    if (!match) {
      result.push(value.join(''));
      return [result, index, 'Cannot find ")" closing after the last parameter'];
    }
    if (match.index > index) {
      value.push(input.substring(index, match.index));
    }
    index = match.index + match[0].length;
    if (match[1] === undefined) {
      break;
    }
    value.push(match[1]);
  }
  result.push(value.join(''));
  return [result, index, undefined];
}

function parseUnescapedArgs(input: string, index: number, count: number): [string[], number, string | undefined] {
  const result: string[] = [];
  let first = true;
  let paramsLeft = count;
  while (paramsLeft > 1) {
    paramsLeft -= 1;
    const nextIndex = input.indexOf(',', index);
    if (nextIndex < 0) {
      return [result, input.length, `Cannot find comma separating parameter ${count - paramsLeft} from the next one`];
    }
    let parameter = input.slice(index, nextIndex);
    parameter = rstripSpace(parameter);
    if (first) {
      first = false;
    } else {
      parameter = lstripSpace(parameter);
    }
    result.push(parameter);
    index = nextIndex + 1;
  }
  const nextIndex = input.indexOf(')', index);
  if (nextIndex < 0) {
    return [result, input.length, 'Cannot find closing ")" after last parameter'];
  }
  let parameter = input.slice(index, nextIndex);
  if (!first) {
    parameter = lstripSpace(parameter);
  }
  result.push(parameter);
  return [result, nextIndex + 1, undefined];
}

function parseString(input: string, opts: ParsingOptions): Paragraph {
  const result: AnyPart[] = [];
  const commandRE = opts.only_classic_markup ? CLASSIC_COMMAND_RE : COMMAND_RE;
  const length = input.length;
  let index = 0;
  while (index < length) {
    commandRE.lastIndex = index;
    const match = commandRE.exec(input);
    if (!match) {
      if (index < length) {
        result.push(<TextPart>{
          type: PartType.TEXT,
          text: input.slice(index),
        });
      }
      break;
    }
    if (match.index > index) {
      result.push(<TextPart>{
        type: PartType.TEXT,
        text: input.slice(index, match.index),
      });
    }
    index = match.index;
    let cmd = match[0];
    let endIndex = index + cmd.length;
    if (cmd.endsWith('(')) {
      cmd = cmd.slice(0, cmd.length - 1);
    }
    const command = PARSER_COMMANDS.get(cmd);
    if (!command) {
      throw Error(`Internal error: unknown command "${cmd}"`);
    }
    let args: string[];
    let error: string | undefined;
    if (command.parameters === 0) {
      args = [];
    } else if (command.escaped_arguments) {
      [args, endIndex, error] = parseEscapedArgs(input, endIndex, command.parameters);
    } else {
      [args, endIndex, error] = parseUnescapedArgs(input, endIndex, command.parameters);
    }
    if (error === undefined) {
      try {
        result.push(command.process(args, opts));
      } catch (exc) {
        error = `${exc}`;
      }
    }
    if (error !== undefined) {
      error = `While parsing ${cmd}${command.parameters > 0 ? '()' : ''} at index ${match.index + 1}: ${error}`;
      switch (opts.errors || 'message') {
        case 'ignore':
          break;
        case 'message':
          result.push(<ErrorPart>{
            type: PartType.ERROR,
            message: error,
          });
          break;
        case 'exception':
          throw Error(error);
      }
    }
    index = endIndex;
  }
  return result;
}

/**
  Parses a string or a list of strings to a list of paragraphs.
 */
export function parse(input: string | string[], opts?: ParsingOptions): Paragraph[] {
  if (!Array.isArray(input)) {
    input = input ? [input] : [];
  }
  const opts_ = opts || {};
  return input.map((par) => parseString('' + par, opts_));
}

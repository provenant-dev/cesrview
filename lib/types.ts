import type { CesrDomain } from 'cesr-ts';

export type InspectionMode = 'stream' | 'matter' | 'indexer' | 'attachments';
export type EncodingDomain = CesrDomain;
export type TableMajor = 1 | 2;

export interface InspectionOptions {
  mode?: InspectionMode;
  domain?: EncodingDomain;
  major?: TableMajor;
}

/** Zero-based byte offsets, with an exclusive end. */
export interface SourceRange {
  start: number;
  end: number;
}

export interface SourceTarget extends SourceRange {
  kind?: 'error' | 'end';
}

export interface PrimitiveMetadata {
  Family: 'Counter' | 'Indexed signature' | 'Matter';
  Code: string;
  Name: string | undefined;
  'Code length': number;
  'Text length': number;
  'Binary length': number;
  Count?: number;
  Version?: string;
  Index?: number;
  'Other index'?: number;
}

export interface InspectionNode {
  kind: 'primitive' | 'group' | 'value';
  label?: string;
  value?: string;
  meta?: PrimitiveMetadata;
  children?: InspectionNode[];
  fieldName?: string;
  source?: SourceRange;
  sourceContainer?: SourceRange;
}

export interface InspectionResult {
  byteLength: number;
  nodes: InspectionNode[];
  annotations: string;
  highlights: SourceRange[];
}

export interface InspectionFailure {
  message: string;
  location: SourceTarget | null;
  locationLabel: string;
}

export interface CesrExample {
  id: string;
  label: string;
  group: string;
  description: string;
  mode: InspectionMode;
  domain: EncodingDomain;
  major: TableMajor;
  /** Text examples and the qb64 representation of binary examples. */
  text: string;
}

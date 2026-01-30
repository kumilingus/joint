import type { dia, shapes } from '@joint/core';
import type { MarkerPreset } from '../theme/link-theme';

export interface StandardLinkShapesTypeMapper {
  'standard.DoubleLink': shapes.standard.DoubleLinkSelectors;
  'standard.ShadowLink': shapes.standard.ShadowLinkSelectors;
  'standard.Link': shapes.standard.LinkSelectors;
}

export type StandardLinkShapesType = keyof StandardLinkShapesTypeMapper;
/**
 * Base interface for graph link.
 * Core properties are mapped to JointJS link attributes.
 * Additional properties become user data stored in the `data` attribute.
 * @group Graph
 * @see https://docs.jointjs.com/learn/features/shapes/links/#dialink
 */
export interface GraphLink extends Record<string, unknown> {
  /**
   * Unique identifier of the link.
   */
  readonly id: dia.Cell.ID;
  /**
   * Source element id or endpoint definition.
   */
  readonly source: dia.Cell.ID | dia.Link.EndJSON;
  /**
   * Target element id or endpoint definition.
   */
  readonly target: dia.Cell.ID | dia.Link.EndJSON;
  /**
   * Optional link type.
   * @default 'ReactLink'
   */
  readonly type?: string;
  /**
   * Z index of the link.
   */
  readonly z?: number;
  /**
   * Link labels.
   */
  readonly labels?: dia.Link.Label[];
  /**
   * Link vertices (waypoints).
   */
  readonly vertices?: dia.Link.Vertex[];
  /**
   * Stroke color of the link line.
   * @default '#333333'
   */
  readonly color?: string;
  /**
   * Stroke width of the link line.
   * @default 2
   */
  readonly width?: number;
  /**
   * Source marker preset name or custom marker definition.
   * Use 'none' or null for no marker.
   * @default 'none'
   */
  readonly sourceMarker?: MarkerPreset | dia.SVGMarkerJSON | null;
  /**
   * Target marker preset name or custom marker definition.
   * Use 'none' or null for no marker.
   * @default 'none'
   */
  readonly targetMarker?: MarkerPreset | dia.SVGMarkerJSON | null;
}

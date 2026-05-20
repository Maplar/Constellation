/**
 * @copyright Copyright (c) 2026 Maplar
 * 基于 floral-notepaper 二次开发新增
 */

declare module "d3-force-3d" {
  export interface SimulationNodeDatum {
    index?: number;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
  }

  export interface SimulationLinkDatum<NodeDatum extends SimulationNodeDatum> {
    index?: number;
    source: number | string | NodeDatum;
    target: number | string | NodeDatum;
  }

  export interface Simulation<NodeDatum extends SimulationNodeDatum, LinkDatum extends SimulationLinkDatum<NodeDatum>> {
    nodes(): NodeDatum[];
    nodes(nodes: NodeDatum[]): this;
    force(name: string): ForceFn<NodeDatum, LinkDatum> | undefined;
    force(name: string, force: ForceFn<NodeDatum, LinkDatum>): this;
    on(typenames: "tick", listener: () => void): this;
    on(typenames: "end", listener: () => void): this;
    tick(iterations?: number): this;
    stop(): this;
  }

  interface ForceFn<NodeDatum extends SimulationNodeDatum, LinkDatum extends SimulationLinkDatum<NodeDatum>> {
    (alpha: number): void;
    initialize(nodes: NodeDatum[], ...args: unknown[]): void;
  }

  interface ForceLink<NodeDatum extends SimulationNodeDatum, LinkDatum extends SimulationLinkDatum<NodeDatum>>
    extends ForceFn<NodeDatum, LinkDatum> {
    id(fn: (node: NodeDatum, i: number, nodes: NodeDatum[]) => string): this;
    distance(): number;
    distance(d: number | ((link: LinkDatum, i: number, links: LinkDatum[]) => number)): this;
    strength(): number;
    strength(s: number | ((link: LinkDatum, i: number, links: LinkDatum[]) => number)): this;
    links(): LinkDatum[];
    links(links: LinkDatum[]): this;
  }

  interface ForceManyBody<NodeDatum extends SimulationNodeDatum>
    extends ForceFn<NodeDatum, SimulationLinkDatum<NodeDatum>> {
    strength(): number;
    strength(s: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number)): this;
    distanceMin(): number;
    distanceMin(d: number): this;
    distanceMax(): number;
    distanceMax(d: number): this;
    theta(): number;
    theta(t: number): this;
  }

  interface ForceCenter<NodeDatum extends SimulationNodeDatum>
    extends ForceFn<NodeDatum, SimulationLinkDatum<NodeDatum>> {
    x(): number;
    x(x: number): this;
    y(): number;
    y(y: number): this;
    z(): number;
    z(z: number): this;
    strength(): number;
    strength(s: number): this;
  }

  interface ForceRadial<NodeDatum extends SimulationNodeDatum>
    extends ForceFn<NodeDatum, SimulationLinkDatum<NodeDatum>> {
    radius(): (node: NodeDatum, i: number, nodes: NodeDatum[]) => number;
    radius(r: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number)): this;
    strength(): number;
    strength(s: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number)): this;
    x(): number;
    x(x: number): this;
    y(): number;
    y(y: number): this;
    z(): number;
    z(z: number): this;
  }

  interface ForceCollide<NodeDatum extends SimulationNodeDatum>
    extends ForceFn<NodeDatum, SimulationLinkDatum<NodeDatum>> {
    radius(): (node: NodeDatum, i: number, nodes: NodeDatum[]) => number;
    radius(r: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number)): this;
    strength(): number;
    strength(s: number): this;
    iterations(): number;
    iterations(i: number): this;
  }

  interface ForceX<NodeDatum extends SimulationNodeDatum>
    extends ForceFn<NodeDatum, SimulationLinkDatum<NodeDatum>> {
    x(): (node: NodeDatum, i: number, nodes: NodeDatum[]) => number;
    x(x: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number)): this;
    strength(): number;
    strength(s: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number)): this;
  }

  interface ForceY<NodeDatum extends SimulationNodeDatum>
    extends ForceFn<NodeDatum, SimulationLinkDatum<NodeDatum>> {
    y(): (node: NodeDatum, i: number, nodes: NodeDatum[]) => number;
    y(y: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number)): this;
    strength(): number;
    strength(s: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number)): this;
  }

  interface ForceZ<NodeDatum extends SimulationNodeDatum>
    extends ForceFn<NodeDatum, SimulationLinkDatum<NodeDatum>> {
    z(): (node: NodeDatum, i: number, nodes: NodeDatum[]) => number;
    z(z: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number)): this;
    strength(): number;
    strength(s: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number)): this;
  }

  export function forceSimulation<NodeDatum extends SimulationNodeDatum>(
    nodes?: NodeDatum[],
  ): Simulation<NodeDatum, SimulationLinkDatum<NodeDatum>>;

  export function forceSimulation<
    NodeDatum extends SimulationNodeDatum,
    LinkDatum extends SimulationLinkDatum<NodeDatum>,
  >(nodes?: NodeDatum[]): Simulation<NodeDatum, LinkDatum>;

  export function forceLink<
    NodeDatum extends SimulationNodeDatum,
    LinkDatum extends SimulationLinkDatum<NodeDatum>,
  >(links?: LinkDatum[]): ForceLink<NodeDatum, LinkDatum>;

  export function forceCollide<NodeDatum extends SimulationNodeDatum>(): ForceCollide<NodeDatum>;

  export function forceManyBody<NodeDatum extends SimulationNodeDatum>(): ForceManyBody<NodeDatum>;

  export function forceCenter<NodeDatum extends SimulationNodeDatum>(
    x?: number,
    y?: number,
    z?: number,
  ): ForceCenter<NodeDatum>;

  export function forceRadial<NodeDatum extends SimulationNodeDatum>(
    radius?: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number),
  ): ForceRadial<NodeDatum>;

  export function forceX<NodeDatum extends SimulationNodeDatum>(
    x?: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number),
  ): ForceX<NodeDatum>;

  export function forceY<NodeDatum extends SimulationNodeDatum>(
    y?: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number),
  ): ForceY<NodeDatum>;

  export function forceZ<NodeDatum extends SimulationNodeDatum>(
    z?: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number),
  ): ForceZ<NodeDatum>;
}

import { dia, highlighters, g, V, shapes, util } from '@joint/core';
import './index.css';
import {
    GraphProvider,
    Paper,
    useGraph,
    usePaper,
    useNodeSize,
    useNodeLayout,
    type GraphElement,
    type GraphLink,
    type PaperProps,
    type RenderElement,
    Link,
    ReactElementView,
    PaperStore,
    ReactLinkView,
    Port,
    ReactElement,
    Highlighter,
} from '@joint/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Types & Constants
// ============================================================================

const PAPER_CLASSNAME =
  'border-1 border-gray-300 rounded-lg shadow-md overflow-hidden p-2 mr-2';

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;

interface ElementData extends GraphElement {
  readonly type?: 'default' | 'error' | 'info';
  readonly title?: string;
  readonly color?: string;
  readonly jjType?: string;
}

interface LinkData extends GraphLink {
  readonly color?: string;
  readonly sourceMarker?: number;
  readonly targetMarker?: number;
  readonly className?: string;

  readonly jjType?: string;
}

const PAPER_PROPS: PaperProps<ElementData> = {
    defaultAnchor: {
        name: 'midSide',
        args: {
            rotate: true,
            useModelGeometry: true,
        }
    },
    defaultConnectionPoint: {
        name: 'anchor',
        args: {
            offset: 0,
            useModelGeometry: true,
        },
    },
    defaultConnector: {
        name: 'straight',
        args: {
            cornerType: 'line',
            cornerPreserveAspectRatio: true,
            useModelGeometry: true,
        },
    },
    defaultRouter: {
        name: 'rightAngle',
        args: {
            direction: 'right',
            useModelGeometry: true,
        },
    },
    measureNode: (node, view) => {
        if (node === view.el && view instanceof ReactElementView) {
            return new g.Rect(view.model.size());
        }
        return V(node).getBBox();
    }
};

// ============================================================================
// Data
// ============================================================================

const elements: ElementData[] = [
    { id: '1', x: 50, y: 110, angle: 30, title: 'This is error element' },
    { id: '2', x: 550, y: 110, title: 'This is info element' },
    { id: '3', x: 50, y: 370, color: '#f87171' },
    {
        id: '4',
        x: 550,
        y: 370,
        width: 100,
        height: 150,
        jjType: 'standard.Cylinder',
        color: '#60a5fa',
    },
];

const links: LinkData[] = [
    {
        id: 'link1',
        source: { id: '1' },
        target: { id: '2' },
        width: 4,
        color: 'orange',
        targetMarker: 3,
        className: 'dashed-link',
    },
    {
        id: 'link2',
        source: { id: '3' },
        target: { id: '4' },
        color: 'green',
        sourceMarker: 30,
        targetMarker: 33,
    },
    {
        id: 'link3',
        source: { id: '2' },
        target: { id: '4' },
        jjType: 'standard.ShadowLink',
        color: 'purple',
    },
];

// ============================================================================
// Helpers
// ============================================================================

function nodeSizeToModelSize({
    x,
    y,
    width,
    height,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
    const padding = 20;
    return {
        x,
        y,
        width: width + padding,
        height: height + padding,
    };
}

// ============================================================================
// Shapes
// ============================================================================

function Shape({
    color = 'lightgray',
    title = 'No Title',
}: {
  color?: string;
  title?: string;
}) {
    const textRef = useRef<SVGTextElement>(null);
    const { width, height } = useNodeSize(textRef, {
        transform: nodeSizeToModelSize,
    });

    return (
        <>
            <ellipse
                rx={width / 2}
                ry={height / 2}
                cx={width / 2}
                cy={height / 2}
                fill={color}
            />
            <text
                ref={textRef}
                x={width / 2}
                y={height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: 14, fill: 'black' }}
            >
                {title}
            </text>
        </>
    );
}

function MinimapShape({ color = 'lightgray' }: { color?: string }) {
    const layout = useNodeLayout();
    if (!layout) return null;

    const { width, height } = layout;
    return <rect width={width} height={height} fill={color} rx={10} ry={10} />;
}

// ============================================================================
// Minimap
// ============================================================================

function MiniMap({ paper }: { paper: dia.Paper }) {
    const renderElement: RenderElement<ElementData> = useCallback(
        ({ color = 'white' }) => <MinimapShape color={color} />,
        [],
    );

    const [scale, setScale] = useState(1);

    useEffect(() => {
        const { width, height } = paper.getComputedSize();
        const nextScale = Math.min(MINIMAP_WIDTH / width, MINIMAP_HEIGHT / height);
        setScale(nextScale);
    }, [paper]);

    return (
        <div
            className="absolute bg-black bottom-6 right-6 border border-[#dde6ed] rounded-lg overflow-hidden"
            style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
        >
            <Paper
                {...PAPER_PROPS}
                interactive={false}
                width="100%"
                height="100%"
                scale={scale}
                className={PAPER_CLASSNAME}
                elementView={ReactElementView}
                renderElement={renderElement}
            />
        </div>
    );
}

// ============================================================================
// Selection
// ============================================================================

function Selection({ selectedId }: { selectedId: dia.Cell.ID | null }) {
    const paper = usePaper();
    const graph = useGraph();

    useEffect(() => {
        highlighters.mask.removeAll(paper);

        if (!selectedId) return;

        const cell = graph.getCell(selectedId);
        if (!cell) return;

        const view = paper.findViewByModel(cell);
        highlighters.mask.add(view, 'root', 'selection', {
            padding: 8,
            layer: dia.Paper.Layers.FRONT,
        });
    }, [graph, paper, selectedId]);

    return null;
}

// ============================================================================
// Main
// ============================================================================


function Badge({ x = 0, y = 0, size = 10, color = 'red' }: { x?: number; y?: number; size?: number; color?: string }) {
    return (
        <>
            <circle cx={x} cy={y} r={size} fill={color} />
            <text
                x={x}
                y={y}
                dominantBaseline="middle"
                textAnchor="middle"
                fontSize="12"
                fill="white"
                fontWeight="bold"
            >
        !
            </text>
        </>
    );
}

const i = 0;

function Main() {
    const [paperStore, setPaperStore] = useState<PaperStore | null>(null);
    const [showMinimap, setShowMinimap] = useState(false);
    const [selectedElement, setSelectedElement] = useState<dia.Cell.ID | null>(
        null,
    );


    const renderElement = useCallback((data: ElementData) => {
        const { jjType, color = 'lightgray', title = 'No Title' } = data;
        const { width } = useNodeLayout();
        return (
            <>
                {jjType ?? <Shape color={color} title={title} />}
                <Badge x={width + 10} y={-10} size={10} color={color} />
            </>
        );
    }, []);

    const renderLinkLabel = useCallback((data: LinkLabelData) => {
        return (
            <>
                <rect></rect>
            </>

        );


    });

    // const renderLink = useCallback((data: LinkData) => {
    //     const { color = 'white' } = data;
    //     return (
    //         <>
    //             <Link.Base style={{ stroke: color, strokeDasharray: '5,5' }} />
    //             <Link.Label>
    //                 <text dominantBaseline="middle" textAnchor="middle" fill="white">
    //         test
    //                 </text>
    //             </Link.Label>
    //         </>
    //     );
    // }, []);

    const graph = useGraph();

    return (
        <div className="flex flex-col relative w-full h-full">
            <Paper
                {...PAPER_PROPS}
                ref={setPaperStore}
                className={PAPER_CLASSNAME}
                width="100%"
                height="calc(100vh - 100px)"
                snapLinks={{ radius: 25 }}
                renderElement={renderElement}
                // renderLink={renderLink}
                linkView={ReactLinkView}
                // linkView={dia.LinkView}
                onViewPostponed={() => false}
                elementView={ReactElementView}
                validateMagnet={(_, magnet) =>
                    magnet.getAttribute('magnet') !== 'passive'
                }
                // viewManagement={{
                //     disposeHidden: true,
                //     lazyInitialize: true,
                // }}
                // cellVisibility={(cell) => cell.id === '1'}
                linkPinning={false}
                onElementPointerClick={({ elementView }) =>
                    setSelectedElement(elementView.model.id ?? null)
                }
                onElementPointerDblClick={({ elementView }) => {
                    const cell = elementView.model;
                    cell.clone().translate(10, 10).addTo(cell.graph);
                }}
                onBlankPointerClick={() => setSelectedElement(null)}
                // onElementsSizeReady={({ graph }) => {
                //     graph.getCell('1').embed(graph.getCell('3')!);
                // }}
            >
                <Selection selectedId={selectedElement} />
            </Paper>

            {showMinimap && paperStore && <MiniMap paper={paperStore.paper} />}

            <button
                type="button"
                className="absolute top-2 right-2 z-10 bg-gray-900 rounded-lg p-2 shadow-md text-white text-sm"
                onClick={() => setShowMinimap((v) => !v)}
            >
                {showMinimap ? 'Hide Minimap' : 'Show Minimap'}
            </button>

            <button
                type="button"
                className="absolute top-2 left-2 z-10 bg-gray-900 rounded-lg p-2 shadow-md text-white text-sm"
                onClick={() => {
                    console.log('Graph log:', graph.toJSON());
                }}>Log
            </button>
        </div>
    );
}

// ============================================================================
// App
// ============================================================================

export default function App() {

    // const graph = new dia.Graph({}, { cellNamespace: {
    //     ...shapes,
    //     ReactElement,
    // }});
    // graph.on('all', (eventName, ...rest) => {
    //     console.log('Graph event:', eventName, rest);

    // });

    // graph.addCells([{ id: 'temp', type: 'standard.Rectangle', width: 100, height: 100 }]); // To initialize the shapes namespace

    return (
        <GraphProvider
            // graph={graph}
            elements={elements}
            links={links}
            // attributes={
            //     width: 'shapeWidth'
            //     parent: false,
            // }.
            mapDataToElementAttributes={({ data, defaultAttributes }) => {
                const { jjType, color = 'lightgray' } = data as ElementData;
                if (!jjType) return defaultAttributes();
                return {
                    ...defaultAttributes(),
                    type: jjType,
                    attrs: {
                        body: { fill: color },
                    },
                    // ports: {
                    //     groups: {
                    //         in: {
                    //             position: 'top',
                    //         }
                    //     },
                    //     items: [
                    //         {
                    //             id: 'port1',
                    //             group: 'in',
                    //         }
                    //     ],
                    // }
                };
            }}
            mapDataToLinkAttributes={({ data, defaultAttributes }) => {
                const { jjType, color = 'lightgray' } = data as LinkData;

                if (!jjType) {
                    return {
                        ...defaultAttributes(),
                        ...defaultLinkAttributes(data, Theme),
                    };
                }

                const { attrs, ...rest } = defaultAttributes();
                return {
                    ...rest,
                    type: jjType,
                    // labels: [{
                    //     position: 0.5,
                    //     attrs: {
                    //         text: {
                    //             text: 'Custom Label',
                    //         }
                    //     }
                    // }]
                    // attrs: {
                    //     line: { connection: true, stroke: color },
                    // },
                };
            }}
        >
            <Main />
        </GraphProvider>
    );
}


interface Theme {
    link: LinkTheme;
    paper: PaperTheme;
}

interface LinkTheme {
    className: string;
    color: string;
    width: number;
    sourceMarker: number;
    targetMarker: number;
    wrapperBuffer: number;
}

interface PaperTheme {
    backgroundColor: string;
}

const Theme = {
    link: {
        className: 'dashed-link',
        color: 'white',
        width: 2,
        sourceMarker: 0,
        targetMarker: 1,
        wrapperBuffer: 8,
    },
    paper: {
        backgroundColor: '#131e29',
    }
} as const;

function defaultLinkAttributes(data: LinkData & Partial<LinkTheme>, theme: Theme) {
    const {
        className = theme.link.className,
        color = theme.link.color,
        width = theme.link.width,
        sourceMarker = theme.link.sourceMarker,
        targetMarker = theme.link.targetMarker
    } = data;
    return {
        attrs: {
            line: {
                class: className,
                connection: true,
                stroke: color,
                strokeWidth: width,
                strokeLinejoin: 'round',
                sourceMarker: getMarker(sourceMarker, theme),
                targetMarker: getMarker(targetMarker, theme),
            },
            wrapper: {
                connection: true,
                strokeWidth: width + theme.link.wrapperBuffer,
                strokeLinejoin: 'round',
            },
        }
    };
}

function getMarker(markerId: number, theme: Theme) {
    const BG_COLOR = theme.paper.backgroundColor;
    const FG_COLOR = 'context-fill';

    // @todo: should be cached (not parsed every time)
    const markers = [
        null,
        // Marker #1
        {
            markup: util.svg`
            <path d="M 0 0 L 12 -4 L 5 0 L 12 4 z"
                  fill="${FG_COLOR}"
                  stroke-width="2"
            />
        `
        },
        // Marker #2
        {
            markup: util.svg`
            <path d="M 0 0 L 12 -4 L 5 0 L 12 4 z"
                  fill="${FG_COLOR}"
                  stroke-width="2" stroke-linejoin="round"
            />
        `
        },
        // Marker #3
        {
            markup: util.svg`
            <path d="M 0 0 L 8 -4 L 8 4 z"
                  stroke-width="2"
                  fill="${FG_COLOR}"
            />
        `
        },
        // Marker #4
        {
            markup: util.svg`
            <path d="M -2 0 L 15 -4 V 4 z"
                  stroke-width="1"
                  fill="${FG_COLOR}"
             />
        `
        },
        // Marker #5
        {
            markup: util.svg`
            <path d="M 0 0 L 12 -4 L 5 0 L 12 4 z"
                  stroke-width="2" fill="${FG_COLOR}"
            />
        `
        },
        // Marker #6
        {
            markup: util.svg`
            <path d="M 10 3 L 0 0 L 10 -3"
                  fill="none" stroke-width="2"
            />
        `
        },
        // Marker #7
        {
            markup: util.svg`
            <path d="M 10 3 L 0 0 L 10 -3"
                  fill="none"
                  stroke-width="2"
                  stroke-linejoin="round" stroke-linecap="round"
            />
        `
        },
        // Marker #8
        {
            markup: util.svg`
            <path d="M 0 0 L 8 -4 L 8 4 z"
                  stroke-width="2" fill="${FG_COLOR}"
            />
        `
        },
        // Marker #9
        {
            markup: util.svg`
            <path d="M -3 0 L 10 -3 V 3 z"
                  stroke-width="2" fill="${FG_COLOR}"
            />
        `
        },
        // Marker #10
        {
            markup: util.svg`
            <path d="M 0 0 L 12 -4 C 8 0 8 0 12 4 z"
                  stroke-width="2" fill="${FG_COLOR}"
            />
        `
        },
        // Marker #11
        {
            markup: util.svg`
            <path d="M 0 0 L 15 -5 C 4 0 4 0 15 5 z"
                  stroke-width="2" fill="${BG_COLOR}"
            />
        `
        },
        // Marker #12
        {
            markup: util.svg`
            <path d="M 0 0 L 12 -5 C 10 0 10 0 12 5 z"
                  stroke-width="2" fill="${FG_COLOR}"
            />
        `
        },
        // Marker #13
        {
            markup: util.svg`
            <path d="M -5 -10 C 0 -5 0 5 -5 10 L 10 0 z"
                  stroke-width="0" fill="${FG_COLOR}"
             />
        `
        },
        // Marker #14
        {
            markup: util.svg`
            <path d="M 0 0 L 12 -8 C 8 0 8 0 12 8 z"
                  stroke-width="2" fill="${FG_COLOR}"
            />
        `
        },
        // Marker #15
        {
            markup: util.svg`
            <path d="M 0 0 L 10 4"
                  stroke-width="2" stroke-linecap="round"
            />
        `
        },
        // Marker #16
        {
            markup: util.svg`
            <path d="M 0 0 L 8 -5 V 0 z"
                  fill="${FG_COLOR}" stroke-width="2"
            />
        `
        },
        // Marker #17
        {
            markup: util.svg`
            <path d="M 0 0 L 8 -5 V 0 z"
                  fill="${FG_COLOR}"
                  stroke-width="2" stroke-linejoin="round"
            />
        `
        },
        // Marker #18
        {
            markup: util.svg`
            <path d="M 0 0 L 5 -5 L 10 0 L 5 5 z"
                  stroke-width="2" fill="${FG_COLOR}"
            />
        `
        },
        // Marker #19
        {
            markup: util.svg`
            <path d="M 0 0 L 5 -5 L 10 0 L 5 5 z"
                  fill="${FG_COLOR}"
                  stroke-width="2" stroke-linejoin="round"
            />
        `
        },
        // Marker #20
        {
            markup: util.svg`
            <path d="M 0 0 L 5 -5 L 10 0 L 5 5 z"
                  fill="${FG_COLOR}"
                  stroke-width="2" stroke-linejoin="bevel"
            />
        `
        },
        // Marker #21
        {
            markup: util.svg`
            <path d="M 0 0 L 6 -3 L 12 0 L 6 3 z"
                  stroke-width="2" fill="${FG_COLOR}"
            />
        `
        },
        // Marker #22
        {
            markup: util.svg`
            <path d="M 0 0 L 6 -3 L 12 0 L 6 3 z"
                  fill="${FG_COLOR}"
                  stroke-width="2" stroke-linejoin="round"
            />
        `
        },
        // Marker #23
        {
            markup: util.svg`
            <circle r="4" fill="${FG_COLOR}" stroke-width="2" />
        `
        },
        // Marker #24
        {
            markup: util.svg`
            <path d="M 0 -5 V 5" stroke-width="2" fill="${FG_COLOR}" />
        `
        },
        // Marker #25
        {
            markup: util.svg`
            <path d="M 5 -5 V 5" stroke-width="2" fill="none" />
        `
        },
        // Marker #26
        {
            markup: util.svg`
            <path d="M 5 -5 V 5 M 10 -5 V 5" stroke-width="2" fill="${FG_COLOR}" />
        `
        },
        // Marker #27
        {
            markup: util.svg`
            <path d="M 0 -4 L 10 0 M 0 4 L 10 0" stroke-width="2" />
        `
        },
        // Marker #28
        {
            markup: util.svg`
            <path d="M 0 -4 h 10 v 4 M 0 4 h 10 v -4"
                  stroke-width="2" fill="none"
            />
        `
        },
        // Marker #29
        {
            markup: util.svg`
            <path d="M 0 -4 h 10 v 4 M 0 4 h 10 v -4 M 10 0 0 0"
                  stroke-width="2" fill="none"
                  stroke-linecap="round" stroke-linejoin="round"
            />
        `
        },
        // Marker #30
        {
            markup: util.svg`
            <path d="M 5 -5 V 5" stroke-width="2" fill="none" />
            <circle cx="14" r="4" stroke-width="2" fill="${BG_COLOR}" />
        `
        },
        // Marker #31
        {
            markup: util.svg`
            <path d="M 0 -4 L 10 0 M 0 4 L 10 0 M 10 -5 V 5"
                  stroke-width="2"
            />
        `
        },
        // Marker #32
        {
            markup: util.svg`
            <path d="M 3 -5 L 12 5" stroke-width="2" />
        `
        },
        // Marker #33
        {
            markup: util.svg`
            <path d="M 3 -5 L 12 5 M 3 5 L 12 -5"
                  stroke-width="2"
            />
        `
        },
        // Marker #34
        {
            markup: util.svg`
            <path d="M 0 0 L 8 -5 V 0 z"
                  stroke-width="2" fill="${BG_COLOR}"
            />
        `
        },
        // Marker #35
        {
            markup: util.svg`
            <circle r="3"
                    fill="${BG_COLOR}"
                    stroke-width="2"
             />
        `
        },
        // Marker #36
        {
            markup: util.svg`
            <path d="M 0 0 L 5 -5 L 10 0 L 5 5 z"
                  stroke-width="2" fill="${BG_COLOR}"
            />
        `
        },
        // Marker #37
        {
            markup: util.svg`
            <path d="M 0 0 L 6 -3 L 12 0 L 6 3 z"
                  stroke-width="2" fill="${BG_COLOR}"
            />
        `
        },
        // Marker #38
        {
            markup: util.svg`
            <circle r="8" cx="4"
                    fill="${BG_COLOR}"
                    stroke-width="2"
            />
            <path d="M -4 0 H 12 M 4 -8 V 8"
                  fill="none"
                  stroke-width="2"
            />
        `
        },

        // Marker #39
        {
            markup: util.svg`
            <circle r="8" cx="-4"
                    fill="${BG_COLOR}"
                    stroke-width="2"
            />
        `
        },
        // Marker #40
        {
            markup: util.svg`
            <rect x="-5" y="-5" width="10" height="10"
                  fill="${BG_COLOR}"
                  stroke-width="2"
            />
        `
        },
        // Marker #41
        {
            markup: util.svg`
            <rect x="5" y="-5" width="10" height="10"
                  fill="none"
                  stroke-width="2"
            />
        `
        },

        // Marker #42
        {
            markup: util.svg`
            <path d="M -10 -10 C 3 -10 3 10 -10 10"
                  stroke-width="2" fill="none"
             />
        `
        },
        // Marker #43
        {
            markup: util.svg`
            <path d="M 0 -4 L 10 0 M 0 4 L 10 0 M 0 0 H 10"
                  stroke-width="2" fill="none"
            />
            <circle cx="14" r="3" fill="${BG_COLOR}"
                  stroke-width="2"
            />
        `
        },
        // Marker #44
        {
            markup: util.svg`
            <path d="M 10 0 L 0 0"
                  stroke="${BG_COLOR}" stroke-width="3"
            />
            <path d="M 0 0 L 8 -4 V 4 z"
                  stroke-width="2" fill="${BG_COLOR}"
            />
            <path d="M 10 0 L 18 -4 V 4 z"
                  stroke-width="2" fill="${BG_COLOR}"
            />
        `
        },
        // Marker #45
        {
            markup: util.svg`
            <polyline points="-2,0 8,-5 8,-2 17,-5 17,5 8,2 8,5 -2,0"
                  fill="${FG_COLOR}" stroke="none"
            />
        `
        },
        // Marker #46
        {
            markup: util.svg`
            <rect x="-25" width="50" height="25" rx="2" ry="2"
                transform="rotate(-90)"
                fill="${BG_COLOR}" stroke-width="2"
            />
            <image x="-25" width="50" height="25"
                transform="rotate(-90)"
                href="https://assets.codepen.io/7589991/jj-logo-black.svg"
            />
        `
        },
        // Marker #47
        {
            markup: util.svg`
            <rect x="-25" width="50" height="25" rx="2" ry="2"
                transform="rotate(-90)"
                fill="${BG_COLOR}" stroke="#0075f2" stroke-width="2"
            />
            <image x="-25" width="50" height="25"
                transform="rotate(-90)"
                href="https://assets.codepen.io/7589991/jj-logo-red.svg"
            />
        `
        },
        // Marker #48
        {
            markup: util.svg`
            <path d="M -4 0 H 12 M 4 -8 V 8"
                  stroke="#ed2637" stroke-width="2" fill="none"
            />
            <circle r="8" cx="4" fill="none"
                  stroke="#0075f2" stroke-width="2"
            />
        `
        },
        // Marker #49
        {
            markup: util.svg`
            <path d="M 0 -4 L 10 0 M 0 4 L 10 0 M 0 0 H 10"
                  stroke="#0075f2" stroke-width="2" fill="none"
            />
            <circle cx="14" r="3" fill="${BG_COLOR}"
                  stroke="#ed2637" stroke-width="2"
            />
        `
        },
        // Marker #50
        {
            markup: util.svg`
            <path d="M 10 0 L 0 0" stroke="${BG_COLOR}" stroke-width="3" />
            <path d="M -2 0 L 8 -6 V 6 z" stroke="none" fill="#ed2637" />
            <path d="M 8 0 L 18 -6 V 6 z" stroke="none" fill="#0075f2" />
        `
        }
    ];

    return markers[markerId];
}

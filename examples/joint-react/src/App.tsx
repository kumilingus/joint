/**
 * Joint React Demo Application
 *
 * This demo showcases the key features of @joint/react:
 * - Custom element rendering with HTML content
 * - Dynamic node sizing using useNodeSize hook
 * - Interactive selection and highlighting
 * - Port-based connections
 * - Minimap navigation
 * - Link tools and interactions
 * - Graph manipulation (duplicate, delete, zoom to fit)
 */

import { dia, highlighters } from '@joint/core';
import './index.css';
import {
    GraphProvider,
    Paper,
    useGraph,
    usePaper,
    useNodeSize,
    type GraphElement,
    type PaperProps,
    type RenderElement,
    type GraphLink,
    useNodeLayout,
    Link,
} from '@joint/react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Constants
// ============================================================================

/** CSS class name for Paper components (main view and minimap) */
const PAPER_CLASSNAME =
  'border-1 border-gray-300 rounded-lg shadow-md overflow-hidden p-2 mr-2';


interface ElementData extends GraphElement {
    readonly type?: 'default' | 'error' | 'info';
    readonly title?: string;
    readonly color?: string;
    readonly jjType?: string;
}


const PAPER_PROPS: PaperProps<ElementData> = {
    defaultRouter: {
        name: 'rightAngle',
        args: {
            margin: 25,
        },
    },
    defaultConnector: {
        name: 'straight',
        args: { cornerType: 'line', cornerPreserveAspectRatio: true },
    },
};


const elements: ElementData[] = [
    {
        id: '1',
        x: 50,
        y: 110,
        angle: 30,
        title: 'This is error element',
    },
    {
        id: '2',
        x: 550,
        y: 110,
        title: 'This is info element',
    },
    {
        id: '3',
        x: 50,
        y: 370,
        color: '#f87171', // Red for error
    },
    {
        id: '4',
        x: 550,
        y: 370,
        width: 100,
        height: 40,
        jjType: 'standard.Cylinder',
        color: '#60a5fa', // Blue for info
    }
];

const links: GraphLink[] = [
    {
        id: 'link1',
        source: { id: '1' },
        target: { id: '2' },
        color: 'orange',
    },
    {
        id: 'link2',
        source: { id: '3' },
        target: { id: '4' },
        color: 'green',
    }
];

function MiniMap() {
    // Simple render function for minimap - just shows rectangles
    const renderElement: RenderElement<ElementData> = useCallback(
        ({ color = 'white' }) => <MinimapShape color={color} />,
        []
    );

    // Fit content to view when minimap is ready
    // This ensures all elements are visible in the minimap viewport
    const onElementsSizeReady = useCallback(({ paper }: { paper: dia.Paper }) => {
        const { model: graph } = paper;
        const contentArea = graph.getCellsBBox(graph.getElements());

        if (!contentArea) {
            return;
        }

        paper.transformToFitContent({
            contentArea,
            verticalAlign: 'middle',
            horizontalAlign: 'middle',
            padding: 20,
        });
    }, []);

    return (
        <div className="absolute bg-black bottom-6 right-6 w-[200px] h-[150px] border border-[#dde6ed] rounded-lg overflow-hidden">
            <Paper
                {...PAPER_PROPS}
                interactive={false}
                width={'100%'}
                className={PAPER_CLASSNAME}
                height={'100%'}
                // scale={0.2}
                renderElement={renderElement}
                onElementsSizeReady={onElementsSizeReady}
            />
        </div>
    );
}


function nodeSizeToModelSize({ x, y, width: measuredWidth, height: measuredHeight }: { x: number; y: number; width: number; height: number; }) {
    const padding = 20;
    return {
        width: measuredWidth + padding,
        height: measuredHeight + padding,
        x,
        y,
    };
}

function Shape({ color = 'lightgray', title = 'No Title' }: { color?: string; title?: string; }) {
    const nodeRef = useRef<SVGTextElement>(null);
    const { width, height } = useNodeSize(nodeRef, { transform: nodeSizeToModelSize });
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
                ref={nodeRef}
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

function MinimapShape({ color = 'lightgray' }: { color?: string; }) {
    // Note: can this return `undefined` ?
    const { width, height } = useNodeLayout()!;
    return (
        <rect width={width} height={height} fill={color} rx={10} ry={10} />
    );
}

function Selection({ selectedId }: { selectedId: dia.Cell.ID | null; }) {
    const paper = usePaper();
    const graph = useGraph();

    useEffect(() => {
        highlighters.mask.removeAll(paper);
        const cell = selectedId ? graph.getCell(selectedId) : null;
        if (cell) {
            const cellView = paper.findViewByModel(cell);
            highlighters.mask.add(cellView, 'root', 'selection', {
                padding: 8,
                layer: dia.Paper.Layers.FRONT,
            });
        }
    }, [graph, paper, selectedId]);

    return null;
}


function Main() {
    // State for minimap visibility
    const [isMinimapVisible, setIsMinimapVisible] = useState(true);
    // State for selected element ID
    const [selectedElement, setSelectedElement] = useState<dia.Cell.ID | null>(null);

    const renderElement = useCallback((data: ElementData) => {
        const {
            color = 'lightgray',
            title = 'No Title',
        } = data;
        // Note: highlighters can be here, because it does not run for jjType data
        return (
            <Shape color={color} title={title} />
        );
    }, []);

    return (
        <div className="flex flex-col relative w-full h-full">
            <div className="flex flex-col relative h-full">
                <Paper
                    {...PAPER_PROPS}
                    renderElement={renderElement}
                    renderLink={({ color = 'white' }) => {
                        return (
                            <>
                                <Link.Base style={{ stroke: color, strokeDasharray: '5,5' }}/>
                                <Link.Label>
                                    <text
                                        dominantBaseline='middle'
                                        textAnchor='middle'
                                        fill='white'
                                    >
                                        test
                                    </text>
                                </Link.Label>
                            </>
                        );
                    }}
                    // viewManagement={{ disposeHidden: true, lazyInitialize: true }}
                    // cellVisibility={(cell) => cell.isElement() } // Example: hide element with id 'rect1'
                    className={PAPER_CLASSNAME}
                    width="100%"
                    height="calc(100vh - 100px)"
                    snapLinks={{ radius: 25 }}
                    validateMagnet={(_cellView, magnet) => {
                        // Only allow connections to active magnets (not passive ones)
                        return magnet.getAttribute('magnet') !== 'passive';
                    }}
                    linkPinning={false}
                    // Selection handlers
                    onElementPointerClick={({ elementView }) => {
                        const cell = elementView.model;
                        setSelectedElement(cell.id ?? null);
                    }}
                    onElementPointerDblClick={({ elementView }) => {
                        const cell = elementView.model;
                        cell.clone().translate(10, 10).addTo(cell.graph);
                    }}
                    onBlankPointerClick={() => {
                        // Deselect when clicking on empty space
                        setSelectedElement(null);
                    }}
                >
                    <Selection selectedId={selectedElement} />
                </Paper>

                {/* Conditionally render minimap */}
                {isMinimapVisible && <MiniMap />}
                <button
                    type="button"
                    className="absolute top-2 right-2 z-10 bg-gray-900 rounded-lg p-2 shadow-md text-white text-sm"
                    onClick={() => {
                        setIsMinimapVisible(!isMinimapVisible);
                    }}
                >
                    {isMinimapVisible ? 'Hide Minimap' : 'Show Minimap'}
                </button>
            </div>
        </div>
    );
}


export default function App() {
    return (
        <GraphProvider
            elements={elements}
            links={links}
            // mapDataToAttributes = {...}
            elementToGraphSelector={({ element, defaultSelector }) => {
                const { jjType, color = 'lightgray' } = element;
                if (!jjType) return defaultSelector();
                return {
                    ...defaultSelector(),
                    type: jjType,
                    attrs: {
                        body: {
                            fill: color,
                        },
                    },
                };
            }}
        >
            <Main />
        </GraphProvider>
    );
}

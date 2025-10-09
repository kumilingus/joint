import React, { useEffect } from 'react';
import {
    Paper,
    PaperProvider,
    useGraph,
    GraphProvider,
    ReactElement,
    MeasuredNode,
    usePaper,
} from '@joint/react';
import { mvc } from '@joint/core';
import { selectElements, zoomToFit } from '../utils/diagram-utils';
import { useContainerSize } from '../hooks/useContainerSize';
import logo from '../assets/joint.svg';

function DiagramCanvas({
    onSelectionChange,
    onElementEditStart,
    onLinkEditStart,
    selection = []
}) {

    const [containerRef, { width, height }] = useContainerSize();
    const paper = usePaper();
    const graph = useGraph();

    // On container resize, adjust the paper to fit the content
    useEffect(() => {
        zoomToFit(paper);
    }, [width, height, paper]);

    // On graph change, adjust the paper to fit the content
    useEffect(() => {
        const listener = new mvc.Listener();
        listener.listenTo(graph, 'synced', () => zoomToFit(paper));
        return () => listener.stopListening();
    }, [graph, paper]);

    // On selection change, highlight the selected elements
    useEffect(() => {
        selectElements(paper, selection);
    }, [paper, selection]);

    return (
        <div
            ref={containerRef}
            style={{ width: '50%', border: '1px solid #ccc' }}
        >
            <Paper
                // Events
                onElementPointerClick={({ elementView }) => {
                    onSelectionChange?.([elementView.model.id]);
                }}
                onBlankPointerClick={() => {
                    onSelectionChange?.([]);
                }}
                onElementPointerDblClick={({ elementView }) => {
                    onElementEditStart?.({ elementId: elementView.model.id });
                }}
                onLinkPointerDblClick={({ linkView }) => {
                    onLinkEditStart?.({
                        sourceId: linkView.model.getSourceCell().id,
                        targetId: linkView.model.getTargetCell().id
                    });
                }}
            />
        </div>
    );
}

function DiagramPanel({ children }) {
    return (
        <PaperProvider
            width='100%'
            height='100%'
            defaultConnector={{
                name: 'straight',
                args: { cornerType: 'cubic' },
            }}
            defaultConnectionPoint={{
                name: 'boundary',
                args: { offset: 5 },
            }}
            interactive={false}
            background={{
                color: '#ffffff',
                image: logo,
                repeat: 'watermark',
            }}
        >
            {children}
        </PaperProvider>
    );
}

export { DiagramPanel, DiagramCanvas };

import { ShapeKind, Color } from './constants';

const initialData = [
    {
        id: '1',
        name: 'Get Started',
        kind: ShapeKind.Start,
        color: Color.BabyBlue,
        connections: [{ id: 'c1-2', targetId: '2' }],
    },
    {
        id: '2',
        name: 'Has Document?',
        kind: ShapeKind.Decision,
        color: Color.Peach,
        connections: [
            { id: 'c2-3', targetId: '3', label: 'No'  },
            { id: 'c2-6', targetId: '6', label: 'Yes' }
        ],
    },
    {
        id: '3',
        name: 'Request Document',
        kind: ShapeKind.Action,
        color: Color.LightYellow,
        connections: [{ id: 'c3-6', targetId: '6' }],
    },
    {
        id: '4',
        name: 'Reject',
        kind: ShapeKind.Action,
        color: Color.RoseTint,
        connections: [{ id: 'c4-7', targetId: '7' }],
    },
    {
        id: '5',
        name: 'Approve',
        kind: ShapeKind.Action,
        color: Color.MintGreen,
        connections: [{ id: 'c5-7', targetId: '7' }],
    },
    {
        id: '6',
        name: 'Review Document',
        kind: ShapeKind.Document,
        color: Color.Lavender,
        connections: [{ id: 'c6-4', targetId: '4' }, { id: 'c6-5', targetId: '5' }],
    },
    {
        id: '7',
        name: 'Done',
        kind: ShapeKind.End,
        color: Color.BabyBlue,
    },
];

export default initialData;

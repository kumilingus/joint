import { shapeKinds, colors } from '../constants';

const initialData = [
    {
        id: 1,
        name: 'Get Started',
        kind: shapeKinds.Start,
        color: colors.babyBlue,
        connections: [{ id: 'c1-2', targetId: 2 }],
    },
    {
        id: 2,
        name: 'Has Document?',
        kind: shapeKinds.Decision,
        color: colors.peach,
        connections: [
            { id: 'c2-3', targetId: 3, label: 'No'  },
            { id: 'c2-6', targetId: 6, label: 'Yes' }
        ],
    },
    {
        id: 3,
        name: 'Request Document',
        kind: shapeKinds.Action,
        color: colors.lightYellow,
        connections: [{ id: 'c3-6', targetId: 6 }],
    },
    {
        id: 4,
        name: 'Reject',
        kind: shapeKinds.Action,
        color: colors.roseTint,
        connections: [{ id: 'c4-7', targetId: 7 }],
    },
    {
        id: 5,
        name: 'Approve',
        kind: shapeKinds.Action,
        color: colors.mintGreen,
        connections: [{ id: 'c5-7', targetId: 7 }],
    },
    {
        id: 6,
        name: 'Review Document',
        kind: shapeKinds.Document,
        color: colors.lavender,
        connections: [{ id: 'c6-4', targetId: 4 }, { id: 'c6-5', targetId: 5 }],
    },
    {
        id: 7,
        name: 'Done',
        kind: shapeKinds.End,
        color: colors.babyBlue,
    },
];

export default initialData;

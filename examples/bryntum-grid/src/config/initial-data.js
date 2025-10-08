import { shapeKinds, colors } from '../constants';

const initialData = [
    {
        id: 1,
        name: 'Get Started',
        kind: shapeKinds.Start,
        color: colors.babyBlue,
        connections: [{ id: 2 }],
    },
    {
        id: 2,
        name: 'Has Document?',
        kind: shapeKinds.Decision,
        color: colors.peach,
        connections: [
            { id: 3, label: 'No'  },
            { id: 6, label: 'Yes' }
        ],
    },
    {
        id: 3,
        name: 'Create Document',
        kind: shapeKinds.Action,
        color: colors.lightYellow,
        connections: [{ id: 6 }],
    },
    {
        id: 4,
        name: 'Reject',
        kind: shapeKinds.Action,
        color: colors.roseTint,
        connections: [{ id: 7 }],
    },
    {
        id: 5,
        name: 'Approve',
        kind: shapeKinds.Action,
        color: colors.mintGreen,
        connections: [{ id: 7 }],
    },
    {
        id: 6,
        name: 'Review Document',
        kind: shapeKinds.Document,
        color: colors.lavender,
        connections: [{ id: 4 }, { id: 5 }],
    },
    {
        id: 7,
        name: 'Done',
        kind: shapeKinds.End,
        color: colors.babyBlue,
    },
];

export default initialData;

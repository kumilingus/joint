import genogramData from '../../genogram-ts/data.json';

export interface PersonNode {
    key: number;
    name: string;
    sex: 'M' | 'F' | '?';
    mother?: number | '';
    father?: number | '';
    birth?: string;
    death?: boolean | string;
    note?: string;
    adopted?: 'in' | 'out';
    multiple?: number;
    identical?: number;
    reproduction?: string;
    category?: string;
}

export interface MateLink {
    from: number;
    to: number;
    category?: string;
    divorced?: boolean;
}

export interface ParentChildLink {
    parentKey: number;
    childKey: number;
}

export function getPersonNodes(): PersonNode[] {
    return (genogramData.nodeDataArray as PersonNode[]).filter(
        (node) => node.category !== 'MateLabel'
    );
}

export function getParentChildLinks(persons: PersonNode[]): ParentChildLink[] {
    const links: ParentChildLink[] = [];
    const personKeys = new Set(persons.map((p) => p.key));

    for (const person of persons) {
        if (typeof person.mother === 'number' && personKeys.has(person.mother)) {
            links.push({ parentKey: person.mother, childKey: person.key });
        }
        if (typeof person.father === 'number' && personKeys.has(person.father)) {
            links.push({ parentKey: person.father, childKey: person.key });
        }
    }

    return links;
}

export function getMateLinks(): MateLink[] {
    return (genogramData.linkDataArray as MateLink[]).filter(
        (link) => link.category === 'Mate'
    );
}

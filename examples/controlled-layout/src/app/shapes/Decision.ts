import { shapes, util } from "@joint/core";

export const DECISION_TYPE = 'Decision';

export class Decision extends shapes.standard.Path {
    defaults(): Partial<shapes.standard.PathAttributes> {
        return util.defaultsDeep({
            type: DECISION_TYPE,
            size: { width: 100, height: 30 },
            attrs: {
                body: {
                    d: 'M 20 0 H calc(w - 20) L calc(w) calc(h / 2) calc(w - 20) calc(h) H 20 L 0 calc(h / 2) Z',
                    stroke: '#333',
                    strokeWidth: 2
                },
                label: {
                    fill: "#333",
                    fontSize: 10,
                    fontFamily: "sans-serif",
                    style: {
                        textTransform: "capitalize"
                    }
                }
            }
        }, super.defaults);
    }

    static create(id?: string) {
        id = id ?? util.uniqueId();

        return new Decision({
            id,
            attrs: {
                label: {
                    text: id.slice(0, 5)
                }
            }
        });
    }
}

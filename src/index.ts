import type { Plugin } from 'vite';
import { readFileSync } from 'fs';
import parseXML, { XmlElement } from '@rgrove/parse-xml';

export default function (options = {}): Plugin {
    const { defaultImport } = options as any;
    const svgRegex = /\.svg(\?(raw|component))?$/;
    return {
        name: 'vite-plugin-svg',
        enforce: 'pre',
        async load(id) {
            const [path, query] = id.split('?', 2);
            if (!id.match(svgRegex)) {
                return;
            }
            const importType = query || defaultImport;

            if (importType === 'url') {
                return; // Use default svg loader
            }
            let SVGString: string;
            try {
                SVGString = readFileSync(path, 'utf-8');
            } catch (ex) {
                console.warn("File couldn't be loaded, fallback to default loader", ex);
                return; // File couldn't be loaded, fallback to default loader
            }
            if (importType === 'raw') {
                return `export default ${JSON.stringify(SVGString)}`;
            }
            const svgXMLData = parseXML(SVGString);
            const svgData = svgXMLData.children?.[0] || {};
            const abstractNode = element2AbstractNode({
                name: path.replace(/(.*\/)*([^.]+).*/gi, '$2'),
                theme: 'custom',
                extraNodeTransformFactories: [],
                // @ts-ignore
            })(svgData);
            return `export default ${JSON.stringify(abstractNode)}`;
        },
    };
}
export interface AbstractNode {
    tag: string;
    attrs: {
        [key: string]: string;
    };
    children?: AbstractNode[];
}

function element2AbstractNode({ name, theme, extraNodeTransformFactories }: any) {
    return ({ name: tag, attributes, children }: XmlElement): AbstractNode => {
        const data = {
            tag,
            attrs: { ...attributes },
            children: (children as any[])
                .filter(({ type }) => type === 'element')
                .map(item =>
                    element2AbstractNode({
                        name,
                        theme,
                        extraNodeTransformFactories,
                    })(item)
                ),
        };
        if (!(Array.isArray(data.children) && data.children.length > 0)) {
            // @ts-ignore
            delete data.children;
        }
        return extraNodeTransformFactories
            .map((factory: any) => factory({ name, theme }))
            .reduce((transformedNode: AbstractNode, extraTransformFn: (asn: AbstractNode) => AbstractNode) => extraTransformFn(transformedNode), data);
    };
}

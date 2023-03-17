import type { Plugin } from 'vite';
import { readFileSync } from 'fs';
import parseXML, { XmlElement } from '@rgrove/parse-xml';
import SVGO from 'svgo';
import { base } from './baseConfig';

export default function (options?: { defaultImport: string; svgoConfig?: SVGO.OptimizeOptions }): Plugin {
    const { defaultImport, svgoConfig } = options || {};
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
            const result = SVGO.optimize(SVGString, {
                ...base,
                ...svgoConfig,
                plugins: [...(base.plugins || []), ...(svgoConfig?.plugins || [])],
            });
            if ('data' in result) {
                const svgXMLData = parseXML(result.data);
                const svgData = svgXMLData.children?.[0] || {};
                const svgName = path.replace(/(.*\/)*([^.]+).*/gi, '$2');
                const abstractNode = element2AbstractNode({
                    name: svgName,
                    theme: 'custom',
                    extraNodeTransformFactories: [],
                    // @ts-ignore
                })(svgData);
                if (importType === 'data') {
                    return `export default ${JSON.stringify(abstractNode)}`;
                }
                return `export default ${JSON.stringify({ icon: abstractNode, name: svgName, theme: 'custom' })}`;
            } else {
                console.warn('svgo optimize error');
                return;
            }
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

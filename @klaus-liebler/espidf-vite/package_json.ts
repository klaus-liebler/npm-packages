

export interface IPackageJson{
    name: string;
    version: string;
    description?: string;
    main?: string;
    scripts?: Record<string, string>;
    repository?: string | {
        type: string;
        url: string;
    };
    keywords?: string[];
    author?: string | {
        name: string;
        email?: string;
        url?: string;
    };
    license?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    engines?: { [engineName: string]: string };
    homepage?: string;
    bugs?: string | { url: string; email?: string };
    funding?: string | { type?: string; url: string; };
      
}
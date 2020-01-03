import { ApiExtractor, generateApiDoc, TemplateGenerator } from "./src";
import { IComment } from './src/api/models/comment/comment';
import { environment } from './environment';


TemplateGenerator.configure(configuration => {
    configuration.baseUrl = 'https://docs.aurelia.io/';
    configuration.files.tsConfig = environment.tsConfigFile;
    return configuration;
});

generateApiDoc("./result");
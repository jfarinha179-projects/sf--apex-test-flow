/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
// import { TableOptions } from '@oclif/table';
import { Messages, AuthInfo, Connection } from '@salesforce/core';
// import { option } from '@oclif/core/flags';
// import { Errors } from '@oclif/core';


Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf---flow-test-coverage-plugin', 'apex.test.flow');

export type ApexTestFlowResult = {
  uncoveredMappedElements: unknown;
};

export type RunTestLevel = 'RunSpecifiedTests' | 'RunLocalTests' | 'RunAllTestsInOrg';

export type TestsNode =
  | {
      classId: string;
      testMethods?: string[];
    }
  | {
      className: string;
      testMethods?: string[];
    };

export type RunTestsRequest = {
  tests: TestsNode[];
  maxFailedTests?: number;
  testLevel?: RunTestLevel;
  skipCodeCoverage?: boolean;
};

export type RunTestsAsyncRequest = {
    classids?: string;
    classNames?: string;
    suiteids?: string;
    suiteNames?: string;
    maxFailedTests?: number;
    testLevel?: RunTestLevel;
    skipCodeCoverage?: boolean;
} | {
    tests: TestsNode[];
    maxFailedTests?: number;
    testLevel?: RunTestLevel;
    skipCodeCoverage?: boolean;
};

export type FlowCoverageResult = {
    elementsNotCovered: string[];
    flowId: string;
    flowName: string;
    flowNamespace: string | null;
    numElements: number;
    numElementsNotCovered: number;
    processType: string;
};

export type UncoveredElement = {
  'flowName'?: string | undefined;
  'testClassName'?: string  | undefined;
  'testMethod'?: string | number | undefined;
  'totalElements'?: number | undefined;
  'totalCoveredElements'?: number | undefined;
  'totalUncoveredElements'?: number | undefined;
  'numElementsCovered'?: number | undefined;
  'numElementsNotCovered'?: number | undefined;
  'coverPercentage'?: string | number | undefined;
  'elementNames'?: string[] | string |undefined;
  'errorMessage'?: string | undefined;
};

export type SupportedColor =
  | 'black'
  | 'blackBright'
  | 'blue'
  | 'blueBright'
  | 'cyan'
  | 'cyanBright'
  | 'gray'
  | 'green'
  | 'greenBright'
  | 'grey'
  | 'magenta'
  | 'magentaBright'
  | 'red'
  | 'redBright'
  | 'reset'
  | 'white'
  | 'whiteBright'
  | 'yellow'
  | 'yellowBright'
  | `#${string}`
  | `rgb(${number},${number},${number})`;

export type TextOptions = {
  color?: SupportedColor;
  backgroundColor?: SupportedColor;
  bold?: boolean;
  dimColor?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  inverse?: boolean;
};

export type Error = {
  code?: string | undefined;
  exit: false;
  errorCode: string;
  data: object;
};

export default class ApexTestFlow extends SfCommand<ApexTestFlowResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static username: string | undefined;
  // public static testClassName: string | undefined;
  public static flowNames: string | undefined;
  public static excludedFlowNames: string | undefined;
  public static flowTypes: string | undefined;
  public static tests: string | undefined;
  public static verbose: boolean | undefined;
  public static testMethod: boolean | undefined;


  public static readonly flags = {
    'target-org': Flags.requiredOrg({
      summary: messages.getMessage('flags.target-org.summary'),
      description: messages.getMessage('flags.target-org.description'),
      char: 'o',
    }),
    // 'apex-class-name': Flags.string({
    //   summary: messages.getMessage('flags.apex-class-name.summary'),
    //   description: messages.getMessage('flags.apex-class-name.description'),
    //   char: 'r',
    // }),
    'flow-names': Flags.string({
      summary: messages.getMessage('flags.flow-names.summary'),
      description: messages.getMessage('flags.flow-names.description'),
      char: 'f',
    }),
    'excluded-flow-names': Flags.string({
      summary: messages.getMessage('flags.excluded-flow-names.summary'),
      description: messages.getMessage('flags.excluded-flow-names.description'),
      char: 'e',
    }),
    'flow-types': Flags.string({
      summary: messages.getMessage('flags.flow-types.summary'),
      description: messages.getMessage('flags.flow-types.description'),
      char: 't',
    }),
    'tests': Flags.string({
      summary: messages.getMessage('flags.tests.summary'),
      description: messages.getMessage('flags.tests.description'),
      char: 'a',
    }),
    'test-method': Flags.boolean({
      summary: messages.getMessage('flags.test-method.summary'),
      description: messages.getMessage('flags.test-method.description'),
      char: 'm',
    }),
    'verbose': Flags.boolean({
      summary: messages.getMessage('flags.verbose.summary'),
      description: messages.getMessage('flags.verbose.description'),
      char: 'v',
    }),
  };

  private static buildQuery(input: string | undefined, field: string | undefined, include: boolean | undefined): string{
    const localSplitedString: string[] | undefined = input?.split(',');
    let localFinalString: string = '';

    if(localSplitedString !== undefined){
      if(localSplitedString.length === 1){
        localFinalString = `${field} `+( include ? '=' : '!=' )+` '${localSplitedString[0].trim()}'`;

      }else{
        for(const flow of localSplitedString){
          flow.trim();
          if(flow === localSplitedString[localSplitedString.length - 1]){
            localFinalString += `${field} `+( include ? '=' : '!=' )+`' ${flow}'`
          }else{
            localFinalString += `${field} `+( include ? '=' : '!=' )+` '${flow}' OR `;
          }
        }
      }
    }

    return localFinalString;
  }

  public async runApexClass(testClassName: string | undefined, connection: Connection): Promise<void> {

    // delete all records from FlowElementTestCoverage 
    // await connection.tooling.delete('Tooling',['Ids']);
    
    
    if (testClassName) {
      this.log(`Running ${testClassName} class `);
      this.log('\n');
      const splitedClassName = testClassName.split(',');

      const requestList: RunTestsRequest[] = [];

      if(splitedClassName.length > 1){
        splitedClassName.forEach(elem =>{
          const testNode = {
            className: elem,
          };
          const request: RunTestsRequest = {
            tests: [testNode],
            testLevel: 'RunSpecifiedTests',
          };
          requestList.push(request);
        })
      }else{
        const testNode: TestsNode = {
          className: testClassName,
        };
        const request: RunTestsRequest = {
          tests: [testNode],
          testLevel: 'RunSpecifiedTests',
        };
        requestList.push(request);
      }
      
      for(const req of requestList){
        const localResult =  await connection.tooling.runTestsSynchronous(req);
        //  this.error(localResult?.failures.toString(),true);
        if(localResult?.failures){
          this.log(localResult?.failures.toString());
        }
      
      }
    }else{
      // query all ApexClasse WHERE Status = 'Active' AND LastModifiedDate 
      // const requestist: TestsNode[] = [];
      const testList: string[][] = [];
      const queryApexStr = 'SELECT Id, Name FROM ApexClass WHERE IsValid = TRUE AND (Name LIKE \'%Test\' OR Name LIKE \'%Tests\') AND Name = \'MyTestFlowTest\'';
      this.log('queryApexStr',queryApexStr);
      const queryFlowElementsWithCoverage = await connection.tooling.query<{
        Id: string;
      }>(queryApexStr);
      
      // this.log('queryFlowElementsWithCoverage ',queryFlowElementsWithCoverage);

      if(queryFlowElementsWithCoverage.records){
        for(const query of queryFlowElementsWithCoverage.records){
          const testNode: TestsNode = {
            classId: query.Id
          };
          
          const request: RunTestsRequest = {
            tests: [testNode],
            testLevel: 'RunSpecifiedTests',
          };
          const result = await connection.tooling.runTestsSynchronous(request);

          const elementsNotCovered: FlowCoverageResult[] | undefined= result?.flowCoverage;
          const elementsNotCoveredFilter = elementsNotCovered?.filter(elem => elem.elementsNotCovered.length > 1);
          elementsNotCoveredFilter?.forEach(elem =>{
            testList.push(elem.elementsNotCovered);
            this.log('flowName',elem.flowName);
            this.log('numElements',elem.numElements);
            this.log('numElementsNotCovered',elem.numElementsNotCovered);
            this.log('processType',elem.processType);
          })
          
        }
        // this.log('result => ',testList);
        
        // this.log('requestist ',requestist);
      }

    }
    // check result from request
  }

  public async buildTable(
    uncoveredMapElements: Map<string,UncoveredElement[]> | undefined, 
    allElements: Map<string,string[]> | undefined, 
    coveredElements: Map<string,UncoveredElement[]> | undefined
  ): Promise<void> {
    // this.log('typeof uncoveredMapElements',typeof uncoveredMapElements);
    await Promise.all([await new Promise((resolve)=>{resolve(true)})])
      .then(() => {
        setTimeout(() => {
          this.log('coveredElements',coveredElements?.has('asd'));
          if(ApexTestFlow.verbose){
            // this.log('uncoveredMapElements',uncoveredMapElements);
            // this.log('allElements',allElements);
            // this.log('coverElements',coverElements);
              // map by flow name
              // map only one element
              // flowName, Total Elements, CoveredElements, UncoveredElements, Cover Percentage

          }else{
            // this.log('uncoveredMapElements',uncoveredMapElements);
            // this.log('allElements',allElements);
            // this.log('coverElements',coverElements);
            // ApexTestFlow.tests

            // if(ApexTestFlow.testMethod){
              // map by flow,class,method name, total elements by method, covered Elements by method
            // }else{
              // map by flow,class, total elements by class, covered Elements by class
            // }
            
          }
        }, 3000);
      })
      .catch((err: Error) => {
        
        this.error('Build table method',err);
        process.exit(1);
        // uncoveredMapElements.set(err.errorCode, [{ 'Error Message': JSON.stringify(err.data) }]);
      });
  }

  public async mapUncoveredElements(allElems: Map<string,string[]>,coveredElems: Map<string,UncoveredElement[]>, allCoveredElems: unknown): Promise<Map<string,UncoveredElement[]>>{
    const uncoveredElements: Map<string,UncoveredElement[]> = new Map();
    const coveredElements: Map<string,UncoveredElement[]> = new Map();
    await Promise.all([await new Promise((resolve)=>{resolve(true)})])
    .then(() => {

      this.log('allCoveredElems',allCoveredElems);
      // check test method
      if(ApexTestFlow.testMethod){
        
        // filter covered elements by test method
        this.log('ApexTestFlow.tests ',ApexTestFlow.tests);
        

        
      }else if(!ApexTestFlow.testMethod){
        // filter elements by flow

        // const allElementsFlow = allElems.get(flow);
        
        for(const flow of allElems.keys()){
          if(coveredElems.has(flow)){
            // const localCoveredElements = coveredElems.get(flow);
            
            // this.log('localCoveredElements ',localCoveredElements);

            // const uniqueCoveredElements = Array.from(new Set(localCoveredElements));

            // this.log('uniqueCoveredElements ',uniqueCoveredElements);
          }else{

            this.log();

          }
        }
      }
        
      // 'testClassName'?: string  | undefined;
      // 'testMethod'?: string | number | undefined;
      // 'totalElements'?: number | undefined;
      // 'totalCoveredElements'?: number | undefined;
      // 'totalUncoveredElements'?: number | undefined;
      // 'numElementsCovered'?: number | undefined;
      // 'numElementsNotCovered'?: number | undefined;
      // 'coverPercentage'?: string | undefined;
      // 'elementNames'?: string[] | undefined;
      
    });

    return coveredElements ?? uncoveredElements;
  }

  public async mapResultsFromQueries(allElements: object,coveredElements: object): Promise<Map<string,UncoveredElement[]>> {
    this.log('\n');
    this.log('Mapping responses...');

    const allElementsValueList = Object.values(allElements);
    const allFlowElementMapList: Map<string, string[]> = new Map<string, string[]>();

    allElementsValueList.forEach((elem) => {
      if(allFlowElementMapList.has(elem?.FlowRecordVersion?.FlowRecord?.ApiName.toLowerCase())){

        allFlowElementMapList.get(elem?.FlowRecordVersion?.FlowRecord?.ApiName.toLowerCase())?.push(elem?.Name?.toLowerCase());
      }else{

        allFlowElementMapList.set(elem?.FlowRecordVersion?.FlowRecord?.ApiName.toLowerCase(), [elem?.Name?.toLowerCase()]);
      }
    });

    const coveredElementValueList = Object.values(coveredElements);
    const coveredElementsMap: Map<string,UncoveredElement[]> = new Map();

    coveredElementValueList.forEach(elem =>{
      if(coveredElementsMap.has(elem.FlowVersion.Definition.DeveloperName.toLowerCase())){
        coveredElementsMap.get(elem.FlowVersion.Definition.DeveloperName.toLowerCase())?.push({
          'testClassName': elem.FlowTestCoverage.ApexTestClass.Name ,
          'testMethod': elem.FlowTestCoverage.TestMethodName,
          'numElementsCovered': elem.FlowTestCoverage.NumElementsCovered,
          'numElementsNotCovered': elem.FlowTestCoverage.NumElementsNotCovered,
          'totalElements': elem.FlowTestCoverage.NumElementsCovered + elem.FlowTestCoverage.NumElementsNotCovered,
          'elementNames': elem.ElementName,
          // 'coverPercentage': elem.FlowTestCoverage.NumElementsNotCovered === 0 ?  '100 %': elem.FlowTestCoverage.NumElementsCovered / elem.FlowTestCoverage.NumElementsNotCovered * 100 + ' %',
          'coverPercentage': (elem.FlowTestCoverage.NumElementsCovered / (elem.FlowTestCoverage.NumElementsCovered + elem.FlowTestCoverage.NumElementsNotCovered) * 100) + ' %',

        });
        
      }else{
        coveredElementsMap.set(elem.FlowVersion.Definition.DeveloperName.toLowerCase(),[{
          'testClassName': elem.FlowTestCoverage.ApexTestClass.Name ,
          'testMethod': elem.FlowTestCoverage.TestMethodName,
          'numElementsCovered': elem.FlowTestCoverage.NumElementsCovered,
          'numElementsNotCovered': elem.FlowTestCoverage.NumElementsNotCovered,
          'totalElements': elem.FlowTestCoverage.NumElementsCovered + elem.FlowTestCoverage.NumElementsNotCovered,
          'elementNames': elem.ElementName,
          'coverPercentage': (elem.FlowTestCoverage.NumElementsCovered / (elem.FlowTestCoverage.NumElementsCovered + elem.FlowTestCoverage.NumElementsNotCovered) * 100) + ' %',

        }]);
      }
      
      
    });

    // check if method flag is true
    // this.log('coveredElementsMap',coveredElementsMap);
    if(ApexTestFlow.testMethod){
      // filter by test method, return covered elements
      const coveredMapElements: Map<string,UncoveredElement[]>  = await this.mapUncoveredElements(
        allFlowElementMapList, coveredElementsMap, coveredElementValueList
      );
      
      await this.buildTable(undefined,undefined,coveredElementsMap)
      .catch((err: Error)=>{
        this.error('Error buildTable', err);
        process.exit(1);
      });

      return coveredMapElements;

    }else{
      // filter by flow, return uncovered elements
      const uncoveredMapElements: Map<string,UncoveredElement[]>  = await this.mapUncoveredElements(
        allFlowElementMapList, coveredElementsMap, coveredElementValueList
      );
      await this.buildTable(uncoveredMapElements,allFlowElementMapList, undefined);

      return uncoveredMapElements;
      
    }
    
    
  }

  public async queryElementsFromFlows(
    flowNames: string | undefined,
    connection: Connection,
    excludedFlowNames: string | undefined,
    flowTypes: string | undefined,
    tests: string | undefined
  ): Promise<Map<string,UncoveredElement[]>> {
    this.log('Running queries...');

    let whereQueryAllElements: string = '';

    if(flowNames){whereQueryAllElements += ' AND '+ApexTestFlow.buildQuery(flowNames, 'FlowRecordVersion.FlowRecord.ApiName', true)};
    if(excludedFlowNames){whereQueryAllElements += ' AND '+ApexTestFlow.buildQuery(excludedFlowNames, 'FlowRecordVersion.FlowRecord.ApiName', false);};
    if(flowTypes){whereQueryAllElements += ' AND '+ApexTestFlow.buildQuery(flowTypes, 'FlowRecordVersion.FlowRecord.Type', true);};
    
    const allElementsQuery: string = 
      'SELECT Id, Name, FlowRecordVersion.FlowRecord.ApiName, FlowRecordVersion.FlowRecord.Type, FlowRecordVersion.Status '+
      `FROM FlowRecordElement WHERE FlowRecordVersion.Status = 'Active'${whereQueryAllElements}`;

    const queryAllFlowElements = await connection.query<{ 
      Name: string; 
      Id: string; 
      FlowRecordVersion: {
        Status: string;
        FlowRecord: {
          ApiName: string;
          Type: string;
        };
      }; }>(
      allElementsQuery
    );
    // this.log('queryAllFlowElements ',JSON.stringify(queryAllFlowElements.records));
    let whereQueryCoveredElements: string = '';

    if(flowNames){whereQueryCoveredElements += ' AND '+ApexTestFlow.buildQuery(flowNames, 'FlowVersion.Definition.DeveloperName', true)};
    if(excludedFlowNames){whereQueryCoveredElements += ' AND '+ApexTestFlow.buildQuery(excludedFlowNames, 'FlowVersion.Definition.DeveloperName', false)};
    if(flowTypes){whereQueryCoveredElements += ' AND '+ApexTestFlow.buildQuery(flowTypes, 'FlowVersion.ProcessType', true)};
    if(tests){whereQueryCoveredElements += ' AND '+ApexTestFlow.buildQuery(tests, 'FlowTestCoverage.ApexTestClass.Name', true)};

    const coveredElementsQuery: string =
      'SELECT Id, ElementName, FlowTestCoverage.ApexTestClass.Name, FlowVersion.ProcessType, FlowVersion.Definition.DeveloperName, FlowTestCoverage.TestMethodName, '+
      'FlowTestCoverage.NumElementsCovered,FlowTestCoverage.NumElementsNotCovered '+
      `FROM FlowElementTestCoverage WHERE FlowVersion.Status = 'Active'${whereQueryCoveredElements}`;
    // this.log('coveredElementsQuery ',coveredElementsQuery);
    const queryFlowElementsWithCoverage = await connection.tooling.query<{
      ElementName: string;
      Id: string;
      ApexTestClass: {
        Name: string;
      };
      FlowVersion: {
        ProcessType: string;
        Definition: {
          DeveloperName: string;
        };
      };
      FlowTestCoverage: {
        TestMethodName: string;
        NumElementsCovered: number;
        NumElementsNotCovered: number;
      };
    }>(coveredElementsQuery);

    // let returnMap: Map<string, Map<string, string[]>> = new Map<string, Map<string, string[]>> ();
    let returnFullMap: Map<string,UncoveredElement[]> = new Map();

    if (queryAllFlowElements?.records.length === 0){
      this.error('No data exported from queries');
      // process.exit(1);

      // const apexElement: Map<string,Map<string,string[]>> = new Map<string,Map<string,string[]>>();
      // apexElement.set( 'Error Message', new Map().set('Error',['No data exported from queries']));
      // returnFullMap.set('EMPTY QUERY RESULT', new Map().set(apexElement,''));
      
      return returnFullMap;

    } else {
      await this.mapResultsFromQueries(queryAllFlowElements?.records, queryFlowElementsWithCoverage?.records)
        .then((res) => {
          // returnMap = res;
          returnFullMap = res;
        })
        .catch((err: Error) => {
          this.error('Error mapResultsFromQueries',err);
          process.exit(1);
          // returnMap.set(err.errorCode, [{ 'Error Message': JSON.stringify(err.data) }]);
        });

      return returnFullMap;
    }
  }

  public async deleteOldFlowElementTestCoverageRecords(tests: string | undefined,connection: Connection): Promise<void>{
    /*
     * 
     * 
    */
    let whereQueryCoveredElements: string = '';
    if(tests){whereQueryCoveredElements += ' AND '+ApexTestFlow.buildQuery(tests, 'FlowTestCoverage.ApexTestClass.Name', true)};

    // query FlowElementTestCoverage based on test class flag, if true
    const coveredElementsQuery: string =
      'SELECT Id'+
      ` FROM FlowElementTestCoverage WHERE FlowVersion.Status = 'Active'${whereQueryCoveredElements}`;

    const queryFlowElementsWithCoverage = await connection.tooling.query<{
      Id: string;
    }>(coveredElementsQuery);
    // this.log('queryFlowElementsWithCoverage.records',queryFlowElementsWithCoverage.records);
    // delete records from FlowElementTestCoverage
    if(queryFlowElementsWithCoverage.records){
      for(const query of queryFlowElementsWithCoverage.records){
        await connection.tooling.destroy('FlowElementTestCoverage',query.Id)
        .catch((err: Error)=>{
          this.error('Error connection.tooling.destroy',err.data);
          // process.exit(1);
        })
      }
    }
    
    // run classes based on test class flag, if true

    await this.runApexClass(tests, connection)
    .catch((err: Error)=>{
      this.error('Error', err);
      // process.exit(1);
    })
    
    /*
     * 
     * 
    */
  }

  public async orchestrateCalls(): Promise<Map<string,UncoveredElement[]>> {
    const { flags } = await this.parse(ApexTestFlow);

    const username = flags['target-org'].getUsername();
    // const testClassName = flags['apex-class-name'];
    const flowNames = flags['flow-names'];
    const excludedFlowNames = flags['excluded-flow-names'];
    const flowTypes = flags['flow-types'];
    const tests = flags['tests'];
    const verbose = flags['verbose'];
    const testMethod = flags['test-method'];

    const authInfo = await AuthInfo.create({ username });
    const connection = await Connection.create({ authInfo });

    this.log('\n');
    this.logSuccess(`Connected to ${JSON.stringify(username)} using ${connection.version} api version`);
    // this.logSuccess(`Test Class name - ${JSON.stringify(testClassName)}`);
    this.logSuccess(`Flow names - ${JSON.stringify(flowNames)}`);
    this.logSuccess(`Excluded flow names - ${JSON.stringify(excludedFlowNames)}`);
    this.logSuccess(`Flow Types - ${JSON.stringify(flowTypes)}`);
    this.logSuccess(`Test Classes - ${JSON.stringify(tests)}`);
    this.logSuccess(`Verbose - ${JSON.stringify(verbose)}`);
    this.logSuccess(`Test Method - ${JSON.stringify(testMethod)}`);
    this.logSuccess('\n');
    // this.logSuccess();

    await this.deleteOldFlowElementTestCoverageRecords(tests,connection)
    // .catch((err: Error) => {
    //   this.error('Error deleteOldFlowElementTestCoverageRecords', err);
    //   process.exit(1);
    // });

    let finalMap: Map<string,UncoveredElement[]> = new Map<string,UncoveredElement[]>();
    await this.queryElementsFromFlows(flowNames, connection, excludedFlowNames, flowTypes,tests).then((res) => {
      finalMap = res;
    })
    .catch((err: Error)=>{
      this.error('Error queryElementsFromFlows',err);
      process.exit(1);
    });
    return finalMap;
  }

  public async run(): Promise<ApexTestFlowResult> {
    const { flags } = await this.parse(ApexTestFlow);

    ApexTestFlow.username = flags['target-org'].getUsername();
    // ApexTestFlow.testClassName = flags['apex-class-name'];
    ApexTestFlow.flowNames = flags['flow-names'];
    ApexTestFlow.excludedFlowNames = flags['excluded-flow-names'];
    ApexTestFlow.flowTypes = flags['flow-types'];
    ApexTestFlow.tests = flags['tests'];
    ApexTestFlow.verbose = flags['verbose'];
    ApexTestFlow.testMethod = flags['test-method'];

    let finalMap: Map<string,UncoveredElement[]> = new Map<string,UncoveredElement[]>();
    await this.orchestrateCalls()
      .then((res) => {
        finalMap = res;
      })
      // .catch((err: Error) => {
      //   this.error('Error orchestrateCalls',err);
      //   process.exit(1);
      //   // const apexElement: Map<string, string[]> = new Map<string, string[]>();
      //   // apexElement.set( 'Error Message', [JSON.stringify(err.data)]);
      //   // finalMap.set(err.errorCode, new Map().set('Error',apexElement));
      // });

    return {
      // here
      uncoveredMappedElements: JSON.parse(JSON.stringify(Object.fromEntries(finalMap))),
    };
  }
}
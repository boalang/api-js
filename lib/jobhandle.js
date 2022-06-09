//
// Copyright 2022 Robert Dyer,
//                and University of Nebraska Board of Regents
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

const {ExecutionStatus, CompilerStatus} = require('./boaclient.js');

/**
 * An immutable handle to a Boa job.
 */
class JobHandle {
  /** @type {BoaClient} */
  #client = null;
  #id = -1;
  #submitted = Date.now();
  /** @type {Dataset} */
  #input = {};
  #compilerStatus = '';
  #executionStatus = '';
  #outputSize = 64 * 1024;

  /**
    * Create a new job handle.
    * @param {BoaClient} client
    * @param {number} id
    * @param {string} submitted
    * @param {Dataset} input
    * @param {string} compilerStatus
    * @param {string} executionStatus
    */
  constructor(client, id, submitted, input, compilerStatus, executionStatus) {
    this.#client = client;
    this.#id = id;
    this.#submitted = new Date(submitted);
    this.#input = input;
    this.#compilerStatus = compilerStatus;
    this.#executionStatus = executionStatus;
  }

  /**
   * Sets the output size (default: 64k).
   * @param {string} outputSize - the output size, in bytes
   */
  set outputSize(outputSize) {
    this.#outputSize = outputSize;
  }

  /**
   * The job's unique ID.
   */
  get id() {
    return this.#id;
  }

  /**
   * The time the job was submitted.
   */
  get submitted() {
    return this.#submitted;
  }

  /**
   * The dataset this job queried.
   */
  get input() {
    return this.#input;
  }

  /**
   * The status of the job's compilation.
   */
  get compilerStatus() {
    return this.#compilerStatus;
  }

  /**
   * The status of the job's execution.
   */
  get executionStatus() {
    return this.#executionStatus;
  }

  /**
   * Used for debug printing a job handle.
   * @return {string}
   */
  get [Symbol.toStringTag]() {
    return `id: ${this.#id}, ` +
        `submitted: '${this.#submitted.toString()}', ` +
        `input: '${this.#input.name}', ` +
        `compilerStatus: '${this.#compilerStatus}', ` +
        `executionStatus: '${this.#executionStatus}'`;
  }

  /**
   * Stops the job, if it is running.
   */
  async stop() {
    this.#client._stop(this);
  }

  /**
   * Resubmits the job so the query runs again.
   */
  async resubmit() {
    this.#client._resubmit(this);
  }

  /**
   * Deletes the job.
   */
  async delete() {
    this.#client._delete(this);
  }

  /**
   * Refresh the job's cached data.
   */
  async refresh() {
    const job = await this.#client.getJob(this.#id);
    this.#compilerStatus = job.compilerStatus;
    this.#executionStatus = job.executionStatus;
    this.#submitted = job.submitted;
  }

  /**
   * Waits for a job to finish executing.
   * @return {boolean} if the job succeeded
   */
  async wait() {
    while (this.running) {
      await new Promise((r) => setTimeout(r, 2000));
      await this.refresh();
    }
    return this.#compilerStatus != CompilerStatus.ERROR &&
        this.#executionStatus != ExecutionStatus.ERROR;
  }

  /**
   * Gets if the job is currently running.
   * @return {boolean} if the job is running
   */
  get running() {
    return this.#compilerStatus == CompilerStatus.RUNNING ||
      this.#executionStatus == ExecutionStatus.RUNNING ||
      this.#compilerStatus == CompilerStatus.WAITING ||
      (this.#executionStatus == ExecutionStatus.WAITING &&
        this.#compilerStatus == CompilerStatus.FINISHED);
  };

  /**
   * Gets the URL to this job.
   * @type {Promise<string>}
   */
  get url() {
    return this.#client._job_url(this);
  }

  /**
   * Gets if the job is public or not.
   * @type {Promise<boolean>}
   */
  get public() {
    return this.#client._get_public(this);
  }

  /**
   * Sets the public status for this job.
   * @param {boolean} pub - if the job should be public
   */
  set public(pub) {
    return this.#client._set_public(this, pub);
  }

  /**
   * Gets the public URL to this job.
   * @type {Promise<string>}
   */
  get publicUrl() {
    return this.#client._get_public_url(this);
  }

  /**
   * Gets the source query for this job.
   * @type {Promise<string>}
   */
  get source() {
    return this.#client._get_source(this);
  }

  /**
   * Gets the output (up to 64k) from this job, if any.
   * @type {Promise<string>}
   */
  get output() {
    if (this.#executionStatus != ExecutionStatus.FINISHED) {
      throw Error('Job is currently running');
    }
    return this.#client._get_output(this, this.#outputSize);
  }

  /**
   * Gets the full output from this job, if any.
   * @type {Promise<string>}
   */
  get outputFull() {
    if (this.#executionStatus != ExecutionStatus.FINISHED) {
      throw Error('Job is currently running');
    }
    return this.#client._get_output(this);
  }

  /**
   * Gets the compilation errors, if any, for this job.
   * @type {any|Promise<string>}
   */
  get compilerErrors() {
    if (this.#compilerStatus != CompilerStatus.ERROR) {
      return undefined;
    }
    return this.#client._get_errors(this);
  }

  /**
   * Gets the output size, in bytes, for this job.
   * @type {Promise<number>}
   */
  get outputSize() {
    if (this.#executionStatus != ExecutionStatus.FINISHED) {
      throw Error('Job is currently running');
    }
    return this.#client._get_output_size(this);
  }
};
module.exports.JobHandle = JobHandle;

/**
 * Parses the response object and converts to a {JobHandle}.
 * @param {*} client - a Boa API client
 * @param {*} job - the job response to parse
 * @return {JobHandle} a handle to the job
 */
module.exports.parseJob = function parseJob(client, job) {
  return new JobHandle(
      client,
      parseInt(job.id),
      job.submitted,
      job.input,
      job.compiler_status,
      job.hadoop_status,
  );
};

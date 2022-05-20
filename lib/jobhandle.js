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

/**
 * Create an immutable handle to a Boa job.
 * @constructor
 * @param {*} id
 * @param {*} submitted
 * @param {*} input
 * @param {*} compilerStatus
 * @param {*} execStatus
 */
function JobHandle(id, submitted, input, compilerStatus, execStatus) {
  this.id = id;
  this.submitted = submitted;
  this.input = input;
  this.compilerStatus = compilerStatus;
  this.execStatus = execStatus;
  Object.seal(this);
}

module.exports.JobHandle = JobHandle;

JobHandle.prototype.isRunning = function isRunning() {
  return this.compilerStatus == 'Running' ||
    this.execStatus == 'Running' ||
    this.compiler_status == 'Waiting' ||
    (this.exec_status == 'Waiting' && this.compiler_status == 'Finished');
};

// def stop() -> None: ...
// def resubmit() -> None: ...
// def delete() -> None: ...
// def get_url() -> str: ...
// def set_public(status: bool) -> None: ...
// def get_public() -> bool: ...
// def get_public_url() -> str: ...
// def source() -> str: ...
// def get_compiler_errors() -> str: ...
// def output() -> str: ...
// def output_size() -> int: ...
// def wait() -> bool: ...
// def refresh() -> None: ...

/**
 * Parses the response object and converts to a {JobHandle}.
 * @param {*} job - the job response to parse
 * @return {JobHandle} a handle to the job
 */
function parseJob(job) {
  return new JobHandle(
      job.id,
      job.submitted,
      job.input,
      job.compiler_status,
      job.hadoop_status,
  );
}

module.exports.parseJob = parseJob;
